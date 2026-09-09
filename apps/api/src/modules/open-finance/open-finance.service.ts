import { Injectable, Logger } from "@nestjs/common";
import {
  AuditAction,
  ConnectionStatus,
  OpenFinanceConnection as PrismaOpenFinanceConnection,
  Institution as PrismaInstitution,
  Account as PrismaAccount,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { PluggyClientService } from "./pluggy-client.service";
import { CreateOpenFinanceConnectionInput } from "./dto/create-open-finance-connection.input";
import { OpenFinanceConnection } from "./entities/open-finance-connection.entity";

type ConnectionWithRelations = PrismaOpenFinanceConnection & {
  institution: PrismaInstitution;
  accounts: PrismaAccount[];
};

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyClient: PluggyClientService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Token de curta duração para inicializar o widget Pluggy Connect no client. */
  async createConnectToken(userId: string) {
    return this.pluggyClient.createConnectToken(userId);
  }

  /**
   * Lista conexões visíveis ao usuário dentro de uma família.
   *
   * SUPOSIÇÃO: o módulo `sharing-permissions` ainda não existe (ver ordem de
   * implementação em specs/backend/00-overview.md §3 — sharing-permissions
   * vem antes de open-finance, mas ainda não foi construído neste bootstrap).
   * Por ora retornamos apenas as conexões cujo `userId` é o próprio usuário
   * autenticado; quando `sharing-permissions` existir, esta query deve unir
   * também as conexões cujas contas (`Account`) tenham sido compartilhadas
   * com a família via `SharingPermission` (recurso `ACCOUNT`), verificando
   * que o dono da conexão pertence à mesma `familyId`.
   */
  async findVisibleConnections(
    userId: string,
    familyId: string,
  ): Promise<OpenFinanceConnection[]> {
    await this.assertActiveFamilyMember(familyId, userId);

    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId },
      include: { institution: true, accounts: true },
      orderBy: { createdAt: "desc" },
    });

    return connections.map((c) => this.toEntity(c as ConnectionWithRelations));
  }

  /**
   * Cria a conexão Open Finance a partir do `itemId` gerado pelo Pluggy
   * Connect no client. Busca detalhes do item no Pluggy, faz upsert da
   * `Institution` e persiste a `OpenFinanceConnection`.
   */
  async createConnection(
    userId: string,
    input: CreateOpenFinanceConnectionInput,
  ): Promise<OpenFinanceConnection> {
    const item = await this.pluggyClient.getItem(input.itemId);

    const institution = await this.prisma.institution.upsert({
      where: { pluggyConnectorId: item.connector.id },
      update: {
        name: item.connector.name,
        imageUrl: item.connector.imageUrl,
        primaryColor: item.connector.primaryColor,
        type: item.connector.type,
      },
      create: {
        pluggyConnectorId: item.connector.id,
        name: item.connector.name,
        imageUrl: item.connector.imageUrl,
        primaryColor: item.connector.primaryColor,
        type: item.connector.type,
      },
    });

    const connection = await this.prisma.openFinanceConnection.upsert({
      where: { pluggyItemId: item.id },
      update: {
        status: this.mapPluggyStatus(item.status),
        lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
      },
      create: {
        userId,
        institutionId: institution.id,
        pluggyItemId: item.id,
        status: this.mapPluggyStatus(item.status),
        lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
      },
      include: { institution: true, accounts: true },
    });

    await this.auditLog.record({
      actorId: userId,
      action: AuditAction.OPEN_FINANCE_CONNECTED,
      metadata: { institutionName: institution.name, itemId: item.id },
    });

    return this.toEntity(connection as ConnectionWithRelations);
  }

  /**
   * Dispara/verifica sincronização de uma conexão (pull-to-refresh manual).
   * Sujeita ao throttler `openfinance-sync` (aplicado no resolver).
   */
  async syncConnection(
    userId: string,
    connectionId: string,
  ): Promise<OpenFinanceConnection> {
    const connection = await this.findOwnedConnectionOrThrow(
      connectionId,
      userId,
    );

    const item = await this.pluggyClient.triggerItemUpdate(
      connection.pluggyItemId,
    );

    const updated = await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: {
        status: this.mapPluggyStatus(item.status),
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
      include: { institution: true, accounts: true },
    });

    return this.toEntity(updated as ConnectionWithRelations);
  }

  /**
   * Revoga a conexão (soft-delete: `status = REVOKED` + `revokedAt`). Só o
   * dono pode revogar — checagem de posse feita aqui, nunca no DTO (convenção
   * 2.3 de specs/backend/00-overview.md).
   */
  async revokeConnection(
    userId: string,
    connectionId: string,
  ): Promise<boolean> {
    const connection = await this.findOwnedConnectionOrThrow(
      connectionId,
      userId,
    );

    await this.pluggyClient.deleteItem(connection.pluggyItemId);

    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.REVOKED, revokedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: userId,
      action: AuditAction.OPEN_FINANCE_REVOKED,
      metadata: { connectionId: connection.id },
    });

    return true;
  }

  /**
   * Aplica a atualização de status vinda do evento de webhook `item/updated`
   * do Pluggy. Não depende do contexto GraphQL/usuário autenticado — chamado
   * pela function serverless do webhook (ver `api/webhooks/pluggy.ts`).
   */
  async applyWebhookUpdate(pluggyItemId: string): Promise<void> {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { pluggyItemId },
    });
    if (!connection) return; // item desconhecido — ignorado silenciosamente

    const item = await this.pluggyClient.getItem(pluggyItemId);
    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: {
        status: this.mapPluggyStatus(item.status),
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
    });
  }

  /**
   * Registra que o item Pluggy chegou (evento de webhook `item/created`).
   * SUPOSIÇÃO: a criação efetiva da `OpenFinanceConnection` já acontece pela
   * mutation `createOpenFinanceConnection` (disparada pelo client logo após o
   * Pluggy Connect concluir o fluxo) — este handler apenas audita a chegada
   * do evento assíncrono correspondente, sem duplicar a criação. Se o registro
   * ainda não existir quando o evento chegar (condição de corrida entre o
   * webhook e a mutation do client), não fazemos nada aqui; a consistência
   * final é garantida pela mutation e/ou pelo job diário de reconciliação.
   */
  async applyWebhookCreated(pluggyItemId: string): Promise<void> {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { pluggyItemId },
    });
    if (!connection) return;

    await this.auditLog.record({
      actorId: connection.userId,
      action: AuditAction.OPEN_FINANCE_CONNECTED,
      metadata: { pluggyItemId, source: "webhook:item/created" },
    });
  }

  /**
   * Aplica o evento de webhook `item/error` do Pluggy, marcando a conexão com
   * um status de erro.
   *
   * SUPOSIÇÃO: o schema Prisma (`ConnectionStatus`) tem um valor genérico
   * `ERROR` (ver specs/data-model/entities/open-finance-connection.md e
   * schema.prisma) — usamos exatamente esse valor para o evento `item/error`,
   * em vez de sobrecarregar `LOGIN_ERROR`/`OUTDATED` (que representam causas
   * mais específicas já cobertas por `mapPluggyStatus` quando o Pluggy informa
   * o `item.status` detalhado). O corpo de `error` do webhook é logado (nunca
   * exposto ao usuário final) para investigação.
   */
  async applyWebhookError(
    pluggyItemId: string,
    errorPayload: unknown,
  ): Promise<void> {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { pluggyItemId },
    });
    if (!connection) return;

    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.ERROR },
    });

    // SUPOSIÇÃO: `AuditAction` (schema.prisma) não tem um valor específico para
    // "erro reportado pelo provedor" — não inventamos um novo valor de enum
    // (fonte de verdade é o schema Prisma). O erro completo fica registrado
    // apenas no log estruturado (nestjs-pino), não no AuditLog de domínio.
    this.logger.error(
      `Pluggy reportou item/error para o item ${pluggyItemId}: ${JSON.stringify(errorPayload)}`,
    );
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async assertActiveFamilyMember(
    familyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      throw new NotFoundAppException("Família não encontrada.");
    }
  }

  private async findOwnedConnectionOrThrow(
    connectionId: string,
    userId: string,
  ) {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundAppException("Conexão não encontrada.");
    }
    if (connection.userId !== userId) {
      // Aqui usamos FORBIDDEN (não NOT_FOUND): a existência da conexão já é
      // conhecida por quem a listou, ver specs/backend/common/exception-filter.md §2.
      throw new ForbiddenAppException(
        "Somente o dono da conexão pode executar esta ação.",
      );
    }
    return connection;
  }

  /**
   * SUPOSIÇÃO: mapeamento de status livre do Pluggy (`item.status`, string)
   * para o enum fechado `ConnectionStatus` do Prisma — a doc pública do Pluggy
   * usa strings como "UPDATED", "UPDATING", "LOGIN_ERROR", "OUTDATED", "ERROR".
   * "UPDATED" é mapeado para `CONNECTED` (não existe status "UPDATED" no nosso
   * enum) por ser o estado estável equivalente. Qualquer valor não reconhecido
   * cai em `ERROR`, fail-safe.
   */
  private mapPluggyStatus(pluggyStatus: string): ConnectionStatus {
    switch (pluggyStatus) {
      case "UPDATED":
        return ConnectionStatus.CONNECTED;
      case "UPDATING":
        return ConnectionStatus.UPDATING;
      case "LOGIN_ERROR":
        return ConnectionStatus.LOGIN_ERROR;
      case "OUTDATED":
        return ConnectionStatus.OUTDATED;
      default:
        return ConnectionStatus.ERROR;
    }
  }

  private toEntity(connection: ConnectionWithRelations): OpenFinanceConnection {
    return {
      id: connection.id,
      institutionName: connection.institution.name,
      institutionLogoUrl: connection.institution.imageUrl ?? undefined,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt ?? undefined,
      createdAt: connection.createdAt,
      accounts: connection.accounts.map((a) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        maskedNumber: a.maskedNumber ?? undefined,
        currency: a.currency,
        balance: Number(a.balance),
      })),
    };
  }
}
