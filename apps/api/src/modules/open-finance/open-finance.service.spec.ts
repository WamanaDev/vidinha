import { Test } from "@nestjs/testing";
import { OpenFinanceService } from "./open-finance.service";
import { PluggyClientService } from "./pluggy-client.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { AccountsService } from "@modules/accounts/accounts.service";
import {
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
    createConnectToken: jest.Mock;
  };
  let auditLog: { record: jest.Mock };
  let accountsService: { toEntity: jest.Mock };

  const userId = "user-1";
  const otherUserId = "user-2";
  const connectionId = "connection-1";

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
      createConnectToken: jest.fn(),
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

  describe("createConnection", () => {
    it("busca o item no Pluggy, faz upsert da instituição e cria a conexão, registrando auditoria", async () => {
      pluggyClient.getItem.mockResolvedValue({
        id: "pluggy-item-1",
        status: "UPDATED",
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

      const result = await service.createConnection(userId, {
        itemId: "pluggy-item-1",
      });

      expect(pluggyClient.getItem).toHaveBeenCalledWith("pluggy-item-1");
      expect(prisma.institution.upsert).toHaveBeenCalled();
      expect(prisma.openFinanceConnection.upsert).toHaveBeenCalled();
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: userId,
          action: AuditAction.OPEN_FINANCE_CONNECTED,
        }),
      );
      expect(result.institutionName).toBe("Banco Teste");
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
