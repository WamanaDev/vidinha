import { Test } from "@nestjs/testing";
import { OpenFinanceService } from "./open-finance.service";
import { PluggyClientService } from "./pluggy-client.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { AccountsService } from "@modules/accounts/accounts.service";
import {
  BadUserInputAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import {
  AccountType,
  AuditAction,
  CardType,
  ConnectionStatus,
} from "@prisma/client";

describe("OpenFinanceService", () => {
  let service: OpenFinanceService;
  let prisma: {
    openFinanceConnection: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    institution: { upsert: jest.Mock };
    familyMember: { findUnique: jest.Mock };
    account: { upsert: jest.Mock };
    card: { upsert: jest.Mock };
    transaction: { upsert: jest.Mock };
  };
  let pluggyClient: {
    getItem: jest.Mock;
    deleteItem: jest.Mock;
    triggerItemUpdate: jest.Mock;
    listConnectors: jest.Mock;
    createItem: jest.Mock;
    sendItemMfa: jest.Mock;
    getAccounts: jest.Mock;
    getTransactions: jest.Mock;
  };
  let auditLog: { record: jest.Mock };
  let accountsService: { toEntity: jest.Mock };

  const userId = "user-1";
  const otherUserId = "user-2";
  const connectionId = "connection-1";
  const familyId = "family-1";

  beforeEach(async () => {
    prisma = {
      openFinanceConnection: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      institution: { upsert: jest.fn() },
      familyMember: { findUnique: jest.fn() },
      account: { upsert: jest.fn() },
      card: { upsert: jest.fn() },
      transaction: { upsert: jest.fn() },
    };
    pluggyClient = {
      getItem: jest.fn(),
      deleteItem: jest.fn(),
      triggerItemUpdate: jest.fn(),
      listConnectors: jest.fn(),
      createItem: jest.fn(),
      sendItemMfa: jest.fn(),
      getAccounts: jest.fn(),
      getTransactions: jest.fn(),
    };
    auditLog = { record: jest.fn() };
    accountsService = { toEntity: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpenFinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: PluggyClientService, useValue: pluggyClient },
        { provide: AuditLogService, useValue: auditLog },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();

    service = moduleRef.get(OpenFinanceService);
  });

  describe("createItem", () => {
    it("lança FORBIDDEN quando o usuário não é membro ativo da família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.createItem(userId, {
          familyId,
          connectorId: 123,
          parameters: [{ name: "user", value: "joao" }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);

      expect(pluggyClient.createItem).not.toHaveBeenCalled();
    });

    it("lança FORBIDDEN quando o membro foi removido da família (removedAt preenchido)", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId,
        familyId,
        removedAt: new Date(),
      });

      await expect(
        service.createItem(userId, {
          familyId,
          connectorId: 123,
          parameters: [{ name: "user", value: "joao" }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });

    it("cria o item no Pluggy, persiste a conexão e registra auditoria sem vazar credenciais", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId,
        familyId,
        removedAt: null,
      });
      pluggyClient.createItem.mockResolvedValue({
        id: "pluggy-item-1",
        status: "UPDATING",
        executionStatus: "CREATED",
        connector: {
          id: 123,
          name: "Banco Teste",
          imageUrl: "https://img",
          primaryColor: "#000",
          type: "PERSONAL_BANK",
        },
      });
      prisma.institution.upsert.mockResolvedValue({
        id: "institution-1",
        name: "Banco Teste",
      });
      prisma.openFinanceConnection.upsert.mockResolvedValue({
        id: connectionId,
        userId,
        status: ConnectionStatus.UPDATING,
        lastSyncedAt: null,
        createdAt: new Date(),
        institution: {
          id: "institution-1",
          name: "Banco Teste",
          imageUrl: null,
        },
        accounts: [],
      });

      const result = await service.createItem(userId, {
        familyId,
        connectorId: 123,
        parameters: [
          { name: "user", value: "joao" },
          { name: "password", value: "super-secreto" },
        ],
      });

      expect(pluggyClient.createItem).toHaveBeenCalledWith(123, {
        user: "joao",
        password: "super-secreto",
      });
      expect(prisma.institution.upsert).toHaveBeenCalled();
      expect(prisma.openFinanceConnection.upsert).toHaveBeenCalled();
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: userId,
          action: AuditAction.OPEN_FINANCE_CONNECTED,
          metadata: expect.objectContaining({
            connectorId: 123,
            itemId: "pluggy-item-1",
          }),
        }),
      );

      // Nenhuma credencial deve vazar para o audit log.
      const auditCallArg = auditLog.record.mock.calls[0][0];
      expect(JSON.stringify(auditCallArg)).not.toContain("super-secreto");

      expect(result.connection.institutionName).toBe("Banco Teste");
      expect(result.status).toBe("UPDATING");
      expect(result.executionStatus).toBe("CREATED");
    });

    it("propaga BadUserInputAppException quando o Pluggy reporta CONNECTOR_VALIDATION_ERROR", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId,
        familyId,
        removedAt: null,
      });
      pluggyClient.createItem.mockRejectedValue(
        new BadUserInputAppException("Credenciais inválidas."),
      );

      await expect(
        service.createItem(userId, {
          familyId,
          connectorId: 123,
          parameters: [{ name: "user", value: "joao" }],
        }),
      ).rejects.toBeInstanceOf(BadUserInputAppException);

      expect(prisma.openFinanceConnection.upsert).not.toHaveBeenCalled();
      expect(auditLog.record).not.toHaveBeenCalled();
    });
  });

  describe("sendItemMfa", () => {
    const pluggyItemId = "pluggy-item-1";

    it("lança NotFoundAppException quando não existe conexão para o itemId", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.sendItemMfa(userId, {
          itemId: pluggyItemId,
          parameters: [{ name: "token", value: "123456" }],
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);

      expect(pluggyClient.sendItemMfa).not.toHaveBeenCalled();
    });

    it("lança ForbiddenAppException quando o usuário não é dono da conexão", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId,
      });

      await expect(
        service.sendItemMfa(otherUserId, {
          itemId: pluggyItemId,
          parameters: [{ name: "token", value: "123456" }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);

      expect(pluggyClient.sendItemMfa).not.toHaveBeenCalled();
    });

    it("envia o MFA, atualiza a conexão e registra auditoria sem vazar o valor de MFA", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId,
      });
      pluggyClient.sendItemMfa.mockResolvedValue({
        id: pluggyItemId,
        status: "UPDATED",
        executionStatus: "SUCCESS",
        connector: { id: 123, name: "Banco Teste", type: "PERSONAL_BANK" },
      });
      prisma.institution.upsert.mockResolvedValue({
        id: "institution-1",
        name: "Banco Teste",
      });
      prisma.openFinanceConnection.upsert.mockResolvedValue({
        id: connectionId,
        userId,
        status: ConnectionStatus.CONNECTED,
        lastSyncedAt: null,
        createdAt: new Date(),
        institution: {
          id: "institution-1",
          name: "Banco Teste",
          imageUrl: null,
        },
        accounts: [],
      });

      const result = await service.sendItemMfa(userId, {
        itemId: pluggyItemId,
        parameters: [{ name: "token", value: "123456" }],
      });

      expect(pluggyClient.sendItemMfa).toHaveBeenCalledWith(pluggyItemId, {
        token: "123456",
      });
      expect(result.status).toBe("UPDATED");
      expect(result.connection.status).toBe(ConnectionStatus.CONNECTED);

      const auditCallArg = auditLog.record.mock.calls[0][0];
      expect(JSON.stringify(auditCallArg)).not.toContain("123456");
    });
  });

  describe("listConnectors", () => {
    it("filtra por Brasil e repassa includeSandbox ao PluggyClientService", async () => {
      pluggyClient.listConnectors.mockResolvedValue([
        {
          id: 1,
          name: "Banco Teste",
          type: "PERSONAL_BANK",
          country: "BR",
          credentials: [
            {
              name: "user",
              label: "Usuário",
              type: "text",
              optional: false,
            },
          ],
          hasMFA: false,
          oauth: false,
          isOpenFinance: true,
          isSandbox: false,
        },
      ]);

      const result = await service.listConnectors(true);

      expect(pluggyClient.listConnectors).toHaveBeenCalledWith({
        countries: ["BR"],
        sandbox: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Banco Teste");
    });
  });

  describe("revokeConnection — checagem de posse", () => {
    it("impede que um usuário não-dono revogue a conexão de outro usuário", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId: "pluggy-item-1",
      });

      await expect(
        service.revokeConnection(otherUserId, connectionId),
      ).rejects.toBeInstanceOf(ForbiddenAppException);

      expect(pluggyClient.deleteItem).not.toHaveBeenCalled();
      expect(prisma.openFinanceConnection.update).not.toHaveBeenCalled();
    });

    it("permite que o dono revogue a própria conexão e marca REVOKED, registrando auditoria", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId: "pluggy-item-1",
      });
      pluggyClient.deleteItem.mockResolvedValue(undefined);
      prisma.openFinanceConnection.update.mockResolvedValue({});

      const result = await service.revokeConnection(userId, connectionId);

      expect(result).toBe(true);
      expect(pluggyClient.deleteItem).toHaveBeenCalledWith("pluggy-item-1");
      expect(prisma.openFinanceConnection.update).toHaveBeenCalledWith({
        where: { id: connectionId },
        data: expect.objectContaining({ status: ConnectionStatus.REVOKED }),
      });
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: userId,
          action: AuditAction.OPEN_FINANCE_REVOKED,
        }),
      );
    });

    it("lança NotFoundAppException quando a conexão não existe", async () => {
      prisma.openFinanceConnection.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeConnection(userId, "nao-existe"),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });

  describe("findVisibleConnections", () => {
    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findVisibleConnections(userId, "family-1"),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });

    it("retorna apenas as conexões do próprio usuário (SUPOSIÇÃO: sharing-permissions ainda não existe)", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId,
        familyId: "family-1",
        removedAt: null,
      });
      prisma.openFinanceConnection.findMany.mockResolvedValue([
        {
          id: connectionId,
          status: ConnectionStatus.CONNECTED,
          lastSyncedAt: null,
          createdAt: new Date(),
          institution: { name: "Banco Teste", imageUrl: null },
          accounts: [],
        },
      ]);

      const result = await service.findVisibleConnections(userId, "family-1");

      expect(prisma.openFinanceConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("syncConnection — sincronização de contas/cartões/transações", () => {
    const pluggyItemId = "pluggy-item-1";

    // Fakes em memória que simulam o comportamento real de `upsert` do Prisma
    // (dedupe por chave natural), para verificar idempotência de verdade —
    // não apenas contar chamadas de mock.
    let fakeAccounts: Array<Record<string, unknown>>;
    let fakeCards: Array<Record<string, unknown>>;
    let fakeTransactions: Array<Record<string, unknown>>;

    beforeEach(() => {
      fakeAccounts = [];
      fakeCards = [];
      fakeTransactions = [];

      prisma.openFinanceConnection.findUnique.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId,
      });
      pluggyClient.triggerItemUpdate.mockResolvedValue({
        id: pluggyItemId,
        status: "UPDATED",
        executionStatus: "SUCCESS",
      });
      prisma.openFinanceConnection.update.mockResolvedValue({
        id: connectionId,
        userId,
        pluggyItemId,
      });
      prisma.openFinanceConnection.findUniqueOrThrow.mockResolvedValue({
        id: connectionId,
        status: ConnectionStatus.CONNECTED,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        institution: { name: "Banco Teste", imageUrl: null },
        accounts: [],
      });
      accountsService.toEntity.mockResolvedValue({});

      pluggyClient.getAccounts.mockResolvedValue([
        {
          id: "pluggy-acc-1",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          name: "Conta Corrente",
          number: "12345678",
          balance: 1000,
          currencyCode: "BRL",
        },
        {
          id: "pluggy-acc-2",
          type: "CREDIT",
          name: "Cartão de Crédito",
          number: "98765432",
          balance: 250,
          currencyCode: "BRL",
          creditData: { brand: "VISA", creditLimit: 5000 },
        },
      ]);

      pluggyClient.getTransactions.mockResolvedValue({
        results: [
          {
            id: "pluggy-tx-1",
            description: "Compra no mercado",
            amount: 50,
            date: "2026-09-01",
            currencyCode: "BRL",
            type: "DEBIT",
            status: "POSTED",
            accountId: "pluggy-acc-1",
          },
        ],
        next: null,
      });

      prisma.account.upsert.mockImplementation(
        async ({ where, update, create }) => {
          const idx = fakeAccounts.findIndex(
            (a) => a.pluggyAccountId === where.pluggyAccountId,
          );
          if (idx >= 0) {
            fakeAccounts[idx] = { ...fakeAccounts[idx], ...update };
            return fakeAccounts[idx];
          }
          const row = { id: `account-${fakeAccounts.length + 1}`, ...create };
          fakeAccounts.push(row);
          return row;
        },
      );

      prisma.card.upsert.mockImplementation(
        async ({ where, update, create }) => {
          const idx = fakeCards.findIndex(
            (c) => c.pluggyAccountId === where.pluggyAccountId,
          );
          if (idx >= 0) {
            fakeCards[idx] = { ...fakeCards[idx], ...update };
            return fakeCards[idx];
          }
          const row = { id: `card-${fakeCards.length + 1}`, ...create };
          fakeCards.push(row);
          return row;
        },
      );

      prisma.transaction.upsert.mockImplementation(
        async ({ where, update, create }) => {
          const key = where.externalId_accountId_cardId;
          const idx = fakeTransactions.findIndex(
            (t) =>
              t.externalId === key.externalId &&
              (t.accountId ?? null) === (key.accountId ?? null) &&
              (t.cardId ?? null) === (key.cardId ?? null),
          );
          if (idx >= 0) {
            fakeTransactions[idx] = { ...fakeTransactions[idx], ...update };
            return fakeTransactions[idx];
          }
          const row = {
            id: `transaction-${fakeTransactions.length + 1}`,
            ...create,
          };
          fakeTransactions.push(row);
          return row;
        },
      );
    });

    it("mapeia conta Pluggy type=BANK para Account e type=CREDIT para Card", async () => {
      await service.syncConnection(userId, connectionId);

      expect(fakeAccounts).toHaveLength(1);
      expect(fakeAccounts[0]).toMatchObject({
        pluggyAccountId: "pluggy-acc-1",
        type: AccountType.CHECKING,
        connectionId,
        ownerId: userId,
      });

      expect(fakeCards).toHaveLength(1);
      expect(fakeCards[0]).toMatchObject({
        pluggyAccountId: "pluggy-acc-2",
        type: CardType.CREDIT,
        brand: "VISA",
        creditLimit: 5000,
        connectionId,
        ownerId: userId,
      });
    });

    it("nunca loga saldo/número de conta ao sincronizar", async () => {
      const logSpy = jest.spyOn(
        (service as unknown as { logger: { log: (msg: string) => void } })
          .logger,
        "log",
      );

      await service.syncConnection(userId, connectionId);

      const loggedMessages = logSpy.mock.calls.map((call) => String(call[0]));
      expect(loggedMessages.join("\n")).not.toContain("1000");
      expect(loggedMessages.join("\n")).not.toContain("12345678");
    });

    it("é idempotente: rodar a sincronização duas vezes não duplica accounts/cards/transactions", async () => {
      await service.syncConnection(userId, connectionId);
      await service.syncConnection(userId, connectionId);

      expect(fakeAccounts).toHaveLength(1);
      expect(fakeCards).toHaveLength(1);
      // Uma transação por recurso sincronizado (conta + cartão), nunca duplicada.
      expect(fakeTransactions).toHaveLength(2);
    });

    it("não propaga erro do Pluggy ao sincronizar (falha é logada, não derruba o fluxo principal)", async () => {
      pluggyClient.getAccounts.mockRejectedValue(
        new Error("Pluggy fora do ar"),
      );

      await expect(
        service.syncConnection(userId, connectionId),
      ).resolves.toBeDefined();

      expect(prisma.account.upsert).not.toHaveBeenCalled();
    });
  });
});
