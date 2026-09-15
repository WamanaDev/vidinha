import { Test } from "@nestjs/testing";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { SupabaseStorageService } from "@modules/storage/storage.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { AccountType, SharableResourceType } from "@prisma/client";

describe("AccountsService", () => {
  let service: AccountsService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    account: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    openFinanceConnection: { findUnique: jest.Mock };
  };
  let sharingPermissions: {
    findActiveByResourceIds: jest.Mock;
    upsertForResource: jest.Mock;
  };
  let auditLog: { record: jest.Mock };
  let storage: { resolveAvatarUrl: jest.Mock };

  const familyId = "family-1";
  const ownerId = "owner-1";
  const memberId = "member-1";
  const outsiderId = "outsider-1";

  const owner = {
    id: ownerId,
    email: "owner@test.com",
    displayName: null,
    avatarUrl: null,
    createdAt: new Date(),
  };

  const sharedAccount = {
    id: "account-shared",
    ownerId,
    connectionId: null,
    type: AccountType.CHECKING,
    name: "Conta Compartilhada",
    maskedNumber: null,
    currency: "BRL",
    balance: "100.00",
    isManual: false,
    archivedAt: null,
    owner,
  };

  const privateAccount = {
    id: "account-private",
    ownerId,
    connectionId: null,
    type: AccountType.SAVINGS,
    name: "Conta Privada",
    maskedNumber: null,
    currency: "BRL",
    balance: "500.00",
    isManual: true,
    archivedAt: null,
    owner,
  };

  const syncedAccount = {
    id: "account-synced",
    ownerId,
    connectionId: "connection-1",
    type: AccountType.CHECKING,
    name: "Conta Sincronizada",
    maskedNumber: "1234",
    currency: "BRL",
    balance: "900.00",
    isManual: false,
    archivedAt: null,
    owner,
  };

  beforeEach(async () => {
    prisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      account: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      openFinanceConnection: { findUnique: jest.fn() },
    };
    sharingPermissions = {
      findActiveByResourceIds: jest.fn(),
      upsertForResource: jest.fn(),
    };
    auditLog = { record: jest.fn() };
    storage = { resolveAvatarUrl: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
        { provide: AuditLogService, useValue: auditLog },
        { provide: SupabaseStorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  describe("findByFamily", () => {
    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByFamily(outsiderId, familyId),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });

    it("o dono vê as próprias contas, compartilhadas ou não", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: ownerId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: ownerId },
        { userId: memberId },
      ]);
      prisma.account.findMany.mockResolvedValue([
        sharedAccount,
        privateAccount,
      ]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(
        new Map([
          [
            "account-shared",
            {
              resourceId: "account-shared",
              revokedAt: null,
              allowFullDetail: true,
            },
          ],
        ]),
      );

      const result = await service.findByFamily(ownerId, familyId);

      expect(result).toHaveLength(2);
      const shared = result.find((a) => a.id === "account-shared")!;
      const priv = result.find((a) => a.id === "account-private")!;
      expect(shared.sharedWithFamily).toBe(true);
      expect(shared.fullDetailShared).toBe(true);
      expect(priv.sharedWithFamily).toBe(false);
      expect(priv.fullDetailShared).toBe(false);
    });

    it("outro membro da família só vê as contas compartilhadas", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: memberId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: ownerId },
        { userId: memberId },
      ]);
      prisma.account.findMany.mockResolvedValue([
        sharedAccount,
        privateAccount,
      ]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(
        new Map([
          [
            "account-shared",
            {
              resourceId: "account-shared",
              revokedAt: null,
              allowFullDetail: false,
            },
          ],
        ]),
      );

      const result = await service.findByFamily(memberId, familyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("account-shared");
      expect(result[0].sharedWithFamily).toBe(true);
    });

    it("não-membro não vê nenhuma conta (a query nem chega a rodar, lança antes)", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: outsiderId,
        familyId,
        removedAt: new Date(),
      });

      await expect(
        service.findByFamily(outsiderId, familyId),
      ).rejects.toBeInstanceOf(NotFoundAppException);
      expect(prisma.account.findMany).not.toHaveBeenCalled();
    });
  });

  describe("updateSharing", () => {
    it("permite que o dono atualize o compartilhamento da própria conta", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      sharingPermissions.upsertForResource.mockResolvedValue({
        resourceId: privateAccount.id,
        revokedAt: null,
        allowFullDetail: true,
      });

      const result = await service.updateSharing(ownerId, {
        accountId: privateAccount.id,
        sharedWithFamily: true,
        fullDetailShared: true,
      });

      expect(sharingPermissions.upsertForResource).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: ownerId,
          ownerId,
          familyId,
          resourceType: SharableResourceType.ACCOUNT,
          resourceId: privateAccount.id,
          sharedWithFamily: true,
          fullDetailShared: true,
        }),
      );
      expect(result.sharedWithFamily).toBe(true);
      expect(result.fullDetailShared).toBe(true);
    });

    it("lança FORBIDDEN quando um não-dono tenta atualizar o compartilhamento", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);

      await expect(
        service.updateSharing(memberId, {
          accountId: privateAccount.id,
          sharedWithFamily: true,
          fullDetailShared: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);

      expect(sharingPermissions.upsertForResource).not.toHaveBeenCalled();
    });

    it("lança NotFoundAppException quando a conta não existe", async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSharing(ownerId, {
          accountId: "nao-existe",
          sharedWithFamily: true,
          fullDetailShared: false,
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });

  describe("create", () => {
    it("cria uma conta manual (ex.: Carteira) e audita o evento", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: ownerId,
        familyId,
        removedAt: null,
      });
      prisma.account.create.mockResolvedValue({ ...privateAccount, owner });

      const result = await service.create(ownerId, {
        familyId,
        name: "Carteira",
        type: AccountType.CASH,
        balance: 500,
      });

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId,
            isManual: true,
            connectionId: null,
            currency: "BRL",
          }),
        }),
      );
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: ownerId, familyId }),
      );
      expect(result.id).toBe(privateAccount.id);
    });

    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create(outsiderId, {
          familyId,
          name: "Carteira",
          type: AccountType.CASH,
          balance: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
      expect(prisma.account.create).not.toHaveBeenCalled();
    });
  });

  describe("updateManual", () => {
    it("permite que o dono edite uma conta manual", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.account.update.mockResolvedValue({
        ...privateAccount,
        name: "Novo nome",
      });

      const result = await service.updateManual(ownerId, {
        id: privateAccount.id,
        name: "Novo nome",
      });

      expect(result.name).toBe("Novo nome");
      expect(auditLog.record).toHaveBeenCalled();
    });

    it("rejeita editar uma conta sincronizada via Open Finance", async () => {
      prisma.account.findUnique.mockResolvedValue(syncedAccount);

      await expect(
        service.updateManual(ownerId, {
          id: syncedAccount.id,
          name: "Tentativa",
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.account.update).not.toHaveBeenCalled();
    });

    it("rejeita edição por quem não é dono", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);

      await expect(
        service.updateManual(outsiderId, {
          id: privateAccount.id,
          name: "Tentativa",
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });

  describe("archive", () => {
    it("arquiva uma conta manual do dono", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.account.update.mockResolvedValue({
        ...privateAccount,
        archivedAt: new Date(),
      });

      const result = await service.archive(ownerId, privateAccount.id);

      expect(result).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: privateAccount.id },
          data: expect.objectContaining({ archivedAt: expect.any(Date) }),
        }),
      );
      expect(auditLog.record).toHaveBeenCalled();
    });

    it("permite arquivar uma conta sincronizada via Open Finance (excluir uma conta específica sem desconectar a instituição)", async () => {
      prisma.account.findUnique.mockResolvedValue(syncedAccount);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.account.update.mockResolvedValue({
        ...syncedAccount,
        archivedAt: new Date(),
      });

      const result = await service.archive(ownerId, syncedAccount.id);

      expect(result).toBe(true);
      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: syncedAccount.id },
          data: expect.objectContaining({ archivedAt: expect.any(Date) }),
        }),
      );
    });

    it("rejeita arquivar conta de outro usuário", async () => {
      prisma.account.findUnique.mockResolvedValue(privateAccount);

      await expect(
        service.archive(outsiderId, privateAccount.id),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });
});
