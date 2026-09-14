import { Injectable, Logger } from "@nestjs/common";
import {
  AccountType,
  AuditAction,
  CardType,
  ConnectionStatus,
  TransactionSource,
  TransactionType,
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
import {
  PluggyAccount,
  PluggyClientService,
  PluggyItem,
  PluggyTransaction,
} from "./pluggy-client.service";
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
    const status = this.mapPluggyStatus(item);

    const updated = await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: {
        status,
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
    });

    if (status === ConnectionStatus.CONNECTED) {
      await this.syncAccountsAndTransactions(updated);
    }

    // Recarrega com `accounts` após o sync acima (pode ter criado/atualizado
    // contas) para que a resposta reflita o estado mais recente.
    const withRelations =
      await this.prisma.openFinanceConnection.findUniqueOrThrow({
        where: { id: connection.id },
        include: { institution: true, accounts: { include: { owner: true } } },
      });

    return await this.toEntity(withRelations as ConnectionWithRelations);
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
    const status = this.mapPluggyStatus(item);

    const updated = await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: {
        status,
        lastSyncedAt: item.lastUpdatedAt
          ? new Date(item.lastUpdatedAt)
          : new Date(),
      },
    });

    if (status === ConnectionStatus.CONNECTED) {
      await this.syncAccountsAndTransactions(updated);
    }
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

  /**
   * Sincroniza contas, cartões e transações de uma conexão a partir da API do
   * Pluggy, chamado por `syncConnection` (pull-to-refresh manual) e
   * `applyWebhookUpdate` (webhook `item/updated`) sempre que o status
   * resultante é `CONNECTED`. Idempotente: usa `pluggyAccountId`/`externalId`
   * como chaves naturais de upsert, então rodar duas vezes para a mesma
   * conexão nunca duplica registros.
   *
   * Defensivo por design: qualquer falha (rede, erro do Pluggy) é logada e
   * NUNCA propagada — não deve derrubar o fluxo principal do webhook/sync
   * manual, que já respondeu/vai responder com sucesso independentemente do
   * resultado desta sincronização (ver open-finance.module.md §2).
   *
   * NUNCA loga saldo, número de conta ou qualquer dado financeiro sensível —
   * apenas IDs/contadores, mesmo padrão do restante do módulo.
   */
  private async syncAccountsAndTransactions(
    connection: PrismaOpenFinanceConnection,
  ): Promise<void> {
    try {
      const pluggyAccounts = await this.pluggyClient.getAccounts(
        connection.pluggyItemId,
      );

      for (const pluggyAccount of pluggyAccounts) {
        if (this.isPluggyCardAccount(pluggyAccount)) {
          const card = await this.upsertCardFromPluggyAccount(
            connection,
            pluggyAccount,
          );
          await this.syncTransactionsForResource(pluggyAccount.id, {
            cardId: card.id,
          });
        } else {
          const account = await this.upsertAccountFromPluggyAccount(
            connection,
            pluggyAccount,
          );
          await this.syncTransactionsForResource(pluggyAccount.id, {
            accountId: account.id,
          });
        }
      }

      this.logger.log(
        `Sincronização Open Finance concluída para a conexão ${connection.id} (${pluggyAccounts.length} conta(s)/cartão(ões)).`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao sincronizar contas/transações da conexão ${connection.id} (pluggyItemId=${connection.pluggyItemId})`,
        error as Error,
      );
    }
  }

  /**
   * Confirmado via MCP oficial da Pluggy (ver nota em
   * `pluggy-client.service.ts#PluggyAccount`): contas Pluggy com `type:
   * "CREDIT"` viram `Card`; `type: "BANK"` vira `Account`. Mantemos o
   * fallback por `subtype: "CREDIT_CARD"` apenas como defesa extra caso
   * `type` venha ausente/inesperado (fail-safe, não altera o comportamento
   * para os valores documentados).
   */
  private isPluggyCardAccount(pluggyAccount: PluggyAccount): boolean {
    return (
      pluggyAccount.type === "CREDIT" || pluggyAccount.subtype === "CREDIT_CARD"
    );
  }

  /** Últimos 4 dígitos apenas — nunca persiste o número completo (ver 00-DECISIONS §2). */
  private extractLastFourDigits(number?: string): string | undefined {
    if (!number) return undefined;
    return number.slice(-4);
  }

  /**
   * SUPOSIÇÃO: mapeamento de `subtype` Pluggy para `AccountType` —
   * `CHECKING_ACCOUNT` -> `CHECKING`, `SAVINGS_ACCOUNT` -> `SAVINGS`, qualquer
   * outro valor (incluindo ausente) cai em `OTHER` (fail-safe, nunca
   * inventamos um valor de enum inexistente no schema Prisma).
   */
  private mapPluggyAccountType(pluggyAccount: PluggyAccount): AccountType {
    switch (pluggyAccount.subtype) {
      case "CHECKING_ACCOUNT":
        return AccountType.CHECKING;
      case "SAVINGS_ACCOUNT":
        return AccountType.SAVINGS;
      default:
        return AccountType.OTHER;
    }
  }

  private async upsertAccountFromPluggyAccount(
    connection: PrismaOpenFinanceConnection,
    pluggyAccount: PluggyAccount,
  ): Promise<PrismaAccount> {
    const maskedNumber = this.extractLastFourDigits(pluggyAccount.number);
    const data = {
      name: pluggyAccount.name,
      maskedNumber,
      currency: pluggyAccount.currencyCode || "BRL",
      balance: pluggyAccount.balance,
      balanceUpdatedAt: new Date(),
    };

    return this.prisma.account.upsert({
      where: { pluggyAccountId: pluggyAccount.id },
      update: data,
      create: {
        ...data,
        ownerId: connection.userId,
        connectionId: connection.id,
        pluggyAccountId: pluggyAccount.id,
        type: this.mapPluggyAccountType(pluggyAccount),
        isManual: false,
      },
    });
  }

  /**
   * SUPOSIÇÃO: mapeamos `PluggyAccount.balance` (saldo/fatura em aberto de
   * uma conta `type: CREDIT`) para `Card.currentInvoice`, e
   * `creditData.creditLimit` (com fallback para `availableCreditLimit`) para
   * `Card.creditLimit` — não verificado via MCP oficial da Pluggy nesta
   * sessão (ver nota em `pluggy-client.service.ts#PluggyAccount`).
   */
  private async upsertCardFromPluggyAccount(
    connection: PrismaOpenFinanceConnection,
    pluggyAccount: PluggyAccount,
  ) {
    const data = {
      name: pluggyAccount.name,
      brand: pluggyAccount.creditData?.brand,
      lastFourDigits: this.extractLastFourDigits(pluggyAccount.number),
      creditLimit:
        pluggyAccount.creditData?.creditLimit ??
        pluggyAccount.creditData?.availableCreditLimit,
      currentInvoice: pluggyAccount.balance,
    };

    return this.prisma.card.upsert({
      where: { pluggyAccountId: pluggyAccount.id },
      update: data,
      create: {
        ...data,
        ownerId: connection.userId,
        connectionId: connection.id,
        pluggyAccountId: pluggyAccount.id,
        type: CardType.CREDIT,
        isManual: false,
      },
    });
  }

  /**
   * Confirmado via MCP oficial da Pluggy: `tx.type` (`"DEBIT"`|`"CREDIT"`)
   * sempre vem preenchido pela API, já normalizado do ponto de vista do
   * portador (compra no cartão = DEBIT, pagamento de fatura = CREDIT) —
   * nunca invertemos esse sinal nem inferimos pelo `amount`.
   */
  private mapPluggyTransactionType(tx: PluggyTransaction): TransactionType {
    return tx.type === "CREDIT"
      ? TransactionType.CREDIT
      : TransactionType.DEBIT;
  }

  /**
   * Extrai o cursor `after` de uma query-string `next` retornada pela Pluggy
   * (ex.: `"?accountId=abc&after=xyz"`). NUNCA repassamos a query-string
   * inteira adiante — apenas o valor do parâmetro `after`, já decodificado,
   * para montar a próxima chamada com nosso próprio `URLSearchParams` (ver
   * `pluggy-client.service.ts#getTransactions`).
   */
  private extractAfterCursor(next: string | null): string | undefined {
    if (!next) return undefined;
    const query = next.startsWith("?") ? next.slice(1) : next;
    return new URLSearchParams(query).get("after") ?? undefined;
  }

  /**
   * Pagina `GET /v2/transactions` (cursor-based, via `next`) e faz upsert de
   * cada transação usando a chave natural `@@unique([externalId, accountId,
   * cardId])` (ver transaction.md §4 "Deduplicação de sync") — nunca duplica
   * uma transação já importada em re-sincronizações (webhook duplicado,
   * pull-to-refresh repetido, etc).
   *
   * SUPOSIÇÃO: só sincronizamos transações com `status: "POSTED"` (já
   * efetivadas) — transações `"PENDING"` podem mudar de valor/desaparecer
   * depois e o requisito da tarefa não especifica como reconciliar esse
   * caso; ficam de fora do MVP de sync e serão trazidas por uma
   * sincronização futura já como `POSTED`. Transações sem `status` (campo
   * opcional) são tratadas como já efetivadas, por segurança (fail-open só
   * para não perder dados de provedores/sandboxes que não preenchem o campo).
   */
  private async syncTransactionsForResource(
    pluggyAccountId: string,
    ref: { accountId?: string; cardId?: string },
  ): Promise<void> {
    let after: string | undefined;

    do {
      const result = await this.pluggyClient.getTransactions(pluggyAccountId, {
        after,
      });

      for (const tx of result.results) {
        if (tx.status && tx.status !== "POSTED") continue;

        const amount = Math.abs(tx.amount);
        const type = this.mapPluggyTransactionType(tx);
        const occurredAt = new Date(tx.date);

        // O tipo gerado `TransactionExternalIdAccountIdCardIdCompoundUniqueInput`
        // tipa `accountId`/`cardId` como `string` não-opcional (quirk conhecido
        // do Prisma: campos de índice composto único ficam `string` mesmo
        // quando a coluna subjacente é nullable) — em runtime o Prisma traduz
        // `null` para `IS NULL` corretamente, então o cast abaixo é seguro.
        const compoundKey = {
          externalId: tx.id,
          accountId: ref.accountId ?? null,
          cardId: ref.cardId ?? null,
        } as unknown as {
          externalId: string;
          accountId: string;
          cardId: string;
        };

        await this.prisma.transaction.upsert({
          where: {
            externalId_accountId_cardId: compoundKey,
          },
          update: {
            description: tx.description,
            amount,
            type,
            occurredAt,
          },
          create: {
            accountId: ref.accountId,
            cardId: ref.cardId,
            externalId: tx.id,
            description: tx.description,
            amount,
            type,
            source: TransactionSource.OPEN_FINANCE,
            occurredAt,
          },
        });
      }

      after = this.extractAfterCursor(result.next);
    } while (after);
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
