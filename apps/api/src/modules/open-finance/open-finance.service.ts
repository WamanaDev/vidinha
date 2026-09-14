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
import { AccountsService } from "@modules/accounts/accounts.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { PluggyClientService, PluggyItem } from "./pluggy-client.service";
import { CredentialParameterInput } from "./dto/credential-parameter.input";
import { CreateOpenFinanceItemInput } from "./dto/create-open-finance-item.input";
import { SendOpenFinanceItemMfaInput } from "./dto/send-open-finance-item-mfa.input";
import { OpenFinanceConnection } from "./entities/open-finance-connection.entity";
import { OpenFinanceConnector } from "./entities/open-finance-connector.entity";
import { OpenFinanceItemResult } from "./entities/open-finance-item-result.entity";

type ConnectionWithRelations = PrismaOpenFinanceConnection & {
  institution: PrismaInstitution;
  accounts: (PrismaAccount & { owner: import("@prisma/client").User })[];
};

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pluggyClient: PluggyClientService,
    private readonly auditLog: AuditLogService,
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Lista os conectores (instituições) disponíveis para conexão direta via
   * API — substitui o antigo widget Pluggy Connect. Filtramos sempre por
   * Brasil; `includeSandbox` permite ao app testar contra conectores de
   * sandbox (default: apenas conectores de produção).
   */
  async listConnectors(
    includeSandbox = false,
  ): Promise<OpenFinanceConnector[]> {
    const connectors = await this.pluggyClient.listConnectors({
      countries: ["BR"],
      sandbox: includeSandbox,
    });
    // Defensivo: o OpenAPI da Pluggy só declara `id` como obrigatório no
    // `Connector` — todo o resto (inclusive `name`/`type`/`country`/
    // `hasMFA`/`oauth`/`isOpenFinance`/`isSandbox`) pode legitimamente vir
    // ausente. Nosso schema GraphQL declara a maioria desses campos como
    // `!` (não nulo) para simplificar o app — já vimos em produção um
    // conector real sem `oauth`, o que quebrava a serialização da LISTA
    // INTEIRA com "Cannot return null for non-nullable field" (erro mascarado
    // como INTERNAL_ERROR genérico no client). Aplicamos fallback em todos os
    // campos não-opcionais do tipo para não repetir esse apagão a cada campo
    // novo que a Pluggy decidir omitir.
    return connectors.map((c) => ({
      id: c.id,
      name: c.name ?? `Instituição ${c.id}`,
      imageUrl: c.imageUrl,
      primaryColor: c.primaryColor,
      type: c.type ?? "OTHER",
      country: c.country ?? "BR",
      credentials: c.credentials.map((cred) => ({
        name: cred.name,
        label: cred.label,
        type: cred.type,
        placeholder: cred.placeholder,
        validation: cred.validation,
        validationMessage: cred.validationMessage,
        optional: cred.optional ?? false,
        instructions: cred.instructions,
        options: cred.options,
      })),
      hasMFA: c.hasMFA ?? false,
      oauth: c.oauth ?? false,
      oauthUrl: c.oauthUrl,
      health: c.health ? { status: c.health.status } : undefined,
      isOpenFinance: c.isOpenFinance ?? false,
      isSandbox: c.isSandbox ?? false,
    }));
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
      include: { institution: true, accounts: { include: { owner: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      connections.map((c) => this.toEntity(c as ConnectionWithRelations)),
    );
  }

  /**
   * Cria um `Item` (conexão bancária) diretamente via API do Pluggy,
   * repassando as credenciais coletadas pelo formulário nativo do app
   * (substitui o fluxo antigo baseado no widget Pluggy Connect). Persiste a
   * `OpenFinanceConnection` imediatamente, independentemente do item já ter
   * concluído a sincronização — o app deve consultar `status`/`executionStatus`
   * e, se necessário, chamar `sendItemMfa`.
   */
  async createItem(
    userId: string,
    input: CreateOpenFinanceItemInput,
  ): Promise<OpenFinanceItemResult> {
    await this.assertActiveFamilyMemberOrForbidden(input.familyId, userId);

    const parameters = this.toParameterObject(input.parameters);
    const item = await this.pluggyClient.createItem(
      input.connectorId,
      parameters,
    );

    const connection = await this.persistConnectionFromItem(userId, item);

    // SUPOSIÇÃO: reaproveitamos `AuditAction.OPEN_FINANCE_CONNECTED` também
    // para o caso em que o item ainda está `WAITING_USER_INPUT`/MFA pendente
    // (não há um valor de enum mais granular no schema Prisma para "conexão
    // iniciada, aguardando confirmação" — não inventamos um novo valor de
    // enum, ver instrução do agente). O metadado `status` no audit log deixa
    // claro que a conexão pode não estar totalmente ativa ainda. Nenhuma
    // credencial é registrada (apenas connectorId/itemId/status).
    await this.auditLog.record({
      actorId: userId,
      action: AuditAction.OPEN_FINANCE_CONNECTED,
      metadata: {
        connectorId: input.connectorId,
        itemId: item.id,
        status: connection.status,
      },
    });

    return this.toItemResult(connection, item);
  }

  /**
   * Envia o valor de MFA solicitado pelo Pluggy (`OpenFinanceItemResult.mfaParameter`)
   * para um item em `WAITING_USER_INPUT`. Só o dono da conexão associada ao
   * `itemId` pode enviar o MFA (checagem de posse, mesmo padrão de
   * `revokeConnection`/`syncConnection`).
   */
  async sendItemMfa(
    userId: string,
    input: SendOpenFinanceItemMfaInput,
  ): Promise<OpenFinanceItemResult> {
    await this.findOwnedConnectionByItemIdOrThrow(input.itemId, userId);

    const mfaParameters = this.toParameterObject(input.parameters);
    const item = await this.pluggyClient.sendItemMfa(
      input.itemId,
      mfaParameters,
    );

    const connection = await this.persistConnectionFromItem(userId, item);

    await this.auditLog.record({
      actorId: userId,
      action: AuditAction.OPEN_FINANCE_CONNECTED,
      metadata: {
        itemId: item.id,
        status: connection.status,
        mfaSubmitted: true,
      },
    });

    return this.toItemResult(connection, item);
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
        status: this.mapPluggyStatus(item),
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
      include: { institution: true, accounts: { include: { owner: true } } },
    });

    return await this.toEntity(updated as ConnectionWithRelations);
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
        status: this.mapPluggyStatus(item),
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
    });
  }

  /**
   * Registra que o item Pluggy chegou (evento de webhook `item/created`).
   * A criação efetiva da `OpenFinanceConnection` já acontece de forma síncrona
   * em `createItem` (chamada direta à API, sem widget) — este handler apenas
   * audita a chegada do evento assíncrono correspondente, sem duplicar a
   * criação. Se o registro ainda não existir quando o evento chegar (condição
   * de corrida), não fazemos nada aqui; a consistência final é garantida por
   * `createItem` e/ou pelo job diário de reconciliação.
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

  private toParameterObject(
    parameters: CredentialParameterInput[],
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const p of parameters) {
      result[p.name] = p.value;
    }
    return result;
  }

  /**
   * Faz upsert da `Institution` (a partir do `item.connector`) e da
   * `OpenFinanceConnection` (a partir do `item`), reaproveitado por
   * `createItem` e `sendItemMfa` — ambos recebem um `PluggyItem` da API e
   * precisam refletir o estado mais recente no Postgres. NUNCA persiste
   * `parameters`/valores de credencial (o `PluggyItem` retornado pela API do
   * Pluggy nunca inclui isso de volta).
   */
  private async persistConnectionFromItem(
    userId: string,
    item: PluggyItem,
  ): Promise<ConnectionWithRelations> {
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
        status: this.mapPluggyStatus(item),
        lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
      },
      create: {
        userId,
        institutionId: institution.id,
        pluggyItemId: item.id,
        status: this.mapPluggyStatus(item),
        lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
      },
      include: { institution: true, accounts: { include: { owner: true } } },
    });

    return connection as ConnectionWithRelations;
  }

  private async toItemResult(
    connection: ConnectionWithRelations,
    item: PluggyItem,
  ): Promise<OpenFinanceItemResult> {
    return {
      connection: await this.toEntity(connection),
      pluggyItemId: item.id,
      status: item.status,
      executionStatus: item.executionStatus,
      mfaParameter: item.parameter
        ? {
            name: item.parameter.name,
            label: item.parameter.label,
            type: item.parameter.type,
            placeholder: item.parameter.placeholder,
            validation: item.parameter.validation,
            validationMessage: item.parameter.validationMessage,
            optional: item.parameter.optional ?? false,
            instructions: item.parameter.instructions,
            options: item.parameter.options,
          }
        : undefined,
      userAction: item.userAction
        ? {
            type: item.userAction.type,
            instructions: item.userAction.instructions,
            expiresAt: item.userAction.expiresAt
              ? new Date(item.userAction.expiresAt)
              : undefined,
          }
        : undefined,
      // Mensagem segura (nunca inclui credencial/stacktrace) — `error.message`
      // do Pluggy descreve a falha (ex.: "Invalid credentials"), não os valores enviados.
      errorMessage: item.error?.message,
    };
  }

  /**
   * Usado por `findVisibleConnections` (query de leitura pré-existente):
   * NOT_FOUND, não FORBIDDEN — não revelar existência da família a
   * não-membros (mesmo padrão de `family.service.ts#assertActiveMember`, ver
   * specs/backend/common/exception-filter.md §2).
   */
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

  /**
   * Usado por `createItem` (mutation que efetivamente repassa tentativas de
   * login bancário à Pluggy): aqui optamos por FORBIDDEN em vez de NOT_FOUND
   * — o `familyId` já é conhecido/escolhido pelo próprio usuário na tela do
   * app (nunca inferido de outro recurso), então não há vazamento de
   * existência de família a mitigar, e FORBIDDEN comunica melhor a causa real
   * (falta de vínculo ativo) ao client. Segue instrução explícita da tarefa.
   */
  private async assertActiveFamilyMemberOrForbidden(
    familyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      throw new ForbiddenAppException(
        "Você não pertence a esta família ou não tem permissão para esta ação.",
      );
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

  private async findOwnedConnectionByItemIdOrThrow(
    pluggyItemId: string,
    userId: string,
  ) {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { pluggyItemId },
    });
    if (!connection) {
      throw new NotFoundAppException("Conexão não encontrada.");
    }
    if (connection.userId !== userId) {
      throw new ForbiddenAppException(
        "Somente o dono da conexão pode executar esta ação.",
      );
    }
    return connection;
  }

  /**
   * Mapeia o par `(item.status, item.executionStatus)` do Pluggy para o enum
   * fechado `ConnectionStatus` do Prisma.
   *
   * SUPOSIÇÃO: a doc pública do Pluggy usa strings livres como "UPDATED",
   * "UPDATING", "LOGIN_ERROR", "OUTDATED" para `status` — mantemos o
   * mapeamento original por esse campo. Itens recém-criados via `POST /items`
   * (fluxo novo, sem widget) podem chegar com um `status` ainda não
   * "assentado" (ex.: em progresso) mas já trazer um `executionStatus`
   * granular (CREATED, WAITING_USER_INPUT, SUCCESS, LOGIN_ERROR,
   * INVALID_CREDENTIALS, SITE_NOT_AVAILABLE, CONNECTION_ERROR,
   * USER_AUTHORIZATION_PENDING, USER_INPUT_TIMEOUT) — usamos esse campo como
   * sinal auxiliar quando `status` não bate com nenhum valor conhecido.
   * Qualquer combinação não reconhecida cai em `ERROR`, fail-safe.
   */
  private mapPluggyStatus(item: {
    status: string;
    executionStatus?: string;
  }): ConnectionStatus {
    switch (item.status) {
      case "UPDATED":
        return ConnectionStatus.CONNECTED;
      case "UPDATING":
        return ConnectionStatus.UPDATING;
      case "LOGIN_ERROR":
        return ConnectionStatus.LOGIN_ERROR;
      case "OUTDATED":
        return ConnectionStatus.OUTDATED;
    }

    switch (item.executionStatus) {
      case "SUCCESS":
        return ConnectionStatus.CONNECTED;
      case "CREATED":
      case "WAITING_USER_INPUT":
      case "USER_AUTHORIZATION_PENDING":
        return ConnectionStatus.UPDATING;
      case "LOGIN_ERROR":
      case "INVALID_CREDENTIALS":
        return ConnectionStatus.LOGIN_ERROR;
      default:
        return ConnectionStatus.ERROR;
    }
  }

  /**
   * SUPOSIÇÃO: os métodos deste service (`findVisibleConnections`,
   * `createItem`, `sendItemMfa`, `syncConnection`) não têm, em todos os
   * casos, um contexto de família + `SharingPermission` já resolvido para as
   * contas da conexão — por isso mapeamos cada `Account` via
   * `AccountsService#toEntity` sem passar uma `SharingPermission` explícita,
   * o que resulta em `sharedWithFamily: false`/`fullDetailShared: false`
   * (opt-in nunca automático, ver 00-DECISIONS §1 — esse é o padrão seguro).
   * O estado real e atualizado de compartilhamento de cada conta deve ser
   * consultado pela query `accounts(familyId)` (módulo `accounts`), que
   * resolve a `SharingPermission` corretamente por família.
   */
  private async toEntity(
    connection: ConnectionWithRelations,
  ): Promise<OpenFinanceConnection> {
    return {
      id: connection.id,
      institutionName: connection.institution.name,
      institutionLogoUrl: connection.institution.imageUrl ?? undefined,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt ?? undefined,
      createdAt: connection.createdAt,
      accounts: await Promise.all(
        connection.accounts.map((a) => this.accountsService.toEntity(a)),
      ),
    };
  }
}
