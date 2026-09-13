import { Test } from "@nestjs/testing";
import { CategoriesService } from "./categories.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
  ConflictAppException,
} from "@common/errors/app.exceptions";
import { SharableResourceType } from "@prisma/client";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: { count: jest.Mock };
    recurringExpense: { count: jest.Mock };
  };
  let sharingPermissions: {
    findActiveByResourceIds: jest.Mock;
    upsertForResource: jest.Mock;
  };

  const familyId = "family-1";
  const ownerId = "owner-1";
  const memberId = "member-1";

  const globalCategory = {
    id: "cat-global",
    ownerId: null,
    name: "Outros",
    icon: null,
    color: null,
    isIncome: false,
  };
  const ownedCategory = {
    id: "cat-owned",
    ownerId,
    name: "Assinaturas",
    icon: null,
    color: null,
    isIncome: false,
  };

  beforeEach(async () => {
    prisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { count: jest.fn() },
      recurringExpense: { count: jest.fn() },
    };
    sharingPermissions = {
      findActiveByResourceIds: jest.fn(),
      upsertForResource: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe("findByFamily", () => {
    it("retorna categorias globais e da família, com hiddenFromFamily computado", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: memberId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: ownerId },
        { userId: memberId },
      ]);
      prisma.category.findMany.mockResolvedValue([
        globalCategory,
        ownedCategory,
      ]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(new Map());

      const result = await service.findByFamily(memberId, familyId);

      const global = result.find((c) => c.id === globalCategory.id)!;
      const owned = result.find((c) => c.id === ownedCategory.id)!;
      expect(global.isDefault).toBe(true);
      expect(global.hiddenFromFamily).toBe(false);
      expect(owned.isDefault).toBe(false);
      // sem SharingPermission ativa -> oculta (inversão de semântica)
      expect(owned.hiddenFromFamily).toBe(true);
    });

    it("categoria com SharingPermission ativa não fica oculta", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: memberId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([{ userId: ownerId }]);
      prisma.category.findMany.mockResolvedValue([ownedCategory]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(
        new Map([[ownedCategory.id, { revokedAt: null }]]),
      );

      const result = await service.findByFamily(memberId, familyId);
      expect(result[0].hiddenFromFamily).toBe(false);
    });
  });

  describe("update", () => {
    it("cria/mantém a SharingPermission (hiddenFromFamily: false -> sharedWithFamily: true)", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);
      prisma.category.update.mockResolvedValue(ownedCategory);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(new Map());

      await service.update(ownerId, {
        id: ownedCategory.id,
        hiddenFromFamily: false,
      });

      expect(sharingPermissions.upsertForResource).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId,
          familyId,
          resourceType: SharableResourceType.CATEGORY,
          resourceId: ownedCategory.id,
          sharedWithFamily: true,
        }),
      );
    });

    it("revoga a SharingPermission (hiddenFromFamily: true -> sharedWithFamily: false)", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);
      prisma.category.update.mockResolvedValue(ownedCategory);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });

      await service.update(ownerId, {
        id: ownedCategory.id,
        hiddenFromFamily: true,
      });

      expect(sharingPermissions.upsertForResource).toHaveBeenCalledWith(
        expect.objectContaining({ sharedWithFamily: false }),
      );
    });

    it("não permite editar categoria de outro dono", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);

      await expect(
        service.update(memberId, { id: ownedCategory.id, name: "Novo" }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it("não permite editar categoria do catálogo global", async () => {
      prisma.category.findUnique.mockResolvedValue(globalCategory);

      await expect(
        service.update(ownerId, { id: globalCategory.id, name: "Novo" }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });

  describe("delete", () => {
    it("bloqueia exclusão quando há transações vinculadas", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);
      prisma.transaction.count.mockResolvedValue(1);
      prisma.recurringExpense.count.mockResolvedValue(0);

      await expect(
        service.delete(ownerId, ownedCategory.id),
      ).rejects.toBeInstanceOf(ConflictAppException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("bloqueia exclusão quando há despesas recorrentes vinculadas", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);
      prisma.transaction.count.mockResolvedValue(0);
      prisma.recurringExpense.count.mockResolvedValue(2);

      await expect(
        service.delete(ownerId, ownedCategory.id),
      ).rejects.toBeInstanceOf(ConflictAppException);
    });

    it("permite excluir quando não há vínculos", async () => {
      prisma.category.findUnique.mockResolvedValue(ownedCategory);
      prisma.transaction.count.mockResolvedValue(0);
      prisma.recurringExpense.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue(ownedCategory);

      const result = await service.delete(ownerId, ownedCategory.id);
      expect(result).toBe(true);
    });

    it("lança NotFoundAppException quando a categoria não existe", async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(ownerId, "nao-existe"),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });
});
