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
import { AuditAction, ConnectionStatus } from "@prisma/client";

describe("OpenFinanceService", () => {
  let service: OpenFinanceService;
  let prisma: {
    openFinanceConnection: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    institution: { upsert: jest.Mock };
    familyMember: { findUnique: jest.Mock };
  };
  let pluggyClient: {
    getItem: jest.Mock;
    deleteItem: jest.Mock;
    triggerItemUpdate: jest.Mock;
    listConnectors: jest.Mock;
    createItem: jest.Mock;
    sendItemMfa: jest.Mock;
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
      },
      institution: { upsert: jest.fn() },
      familyMember: { findUnique: jest.fn() },
    };
    pluggyClient = {
      getItem: jest.fn(),
      deleteItem: jest.fn(),
      triggerItemUpdate: jest.fn(),
      listConnectors: jest.fn(),
      createItem: jest.fn(),
      sendItemMfa: jest.fn(),
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
});
