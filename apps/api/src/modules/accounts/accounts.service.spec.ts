import { Test } from "@nestjs/testing";
import { AccountsService } from "./accounts.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
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
    account: { findMany: jest.Mock; findUnique: jest.Mock };
    openFinanceConnection: { findUnique: jest.Mock };
  };
  let sharingPermissions: {
    findActiveByResourceIds: jest.Mock;
    upsertForResource: jest.Mock;
  };

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
      account: { findMany: jest.fn(), findUnique: jest.fn() },
      openFinanceConnection: { findUnique: jest.fn() },
    };
    sharingPermissions = {
      findActiveByResourceIds: jest.fn(),
      upsertForResource: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
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
});
