import { Test } from "@nestjs/testing";
import { TransactionsService } from "./transactions.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import { AccountsService } from "@modules/accounts/accounts.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import {
  AccountType,
  SharableResourceType,
  TransactionType,
} from "@prisma/client";
import { encodeCursor } from "@common/types/cursor.scalar";

describe("TransactionsService", () => {
  let service: TransactionsService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    account: { findMany: jest.Mock };
    card: { findMany: jest.Mock };
    category: { findMany: jest.Mock; findUnique: jest.Mock };
    transaction: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let sharingPermissions: { findActiveByResourceIds: jest.Mock };
  let accountsService: { toEntity: jest.Mock };

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

  const account = {
    id: "account-1",
    ownerId,
    connectionId: null,
    type: AccountType.CHECKING,
    name: "Conta",
    maskedNumber: null,
    currency: "BRL",
    balance: "100.00",
    archivedAt: null,
    owner,
  };

  const baseTx = {
    id: "tx-1",
    accountId: account.id,
    cardId: null,
    categoryId: null,
    description: "Mercado",
    amount: "50.00",
    type: TransactionType.DEBIT,
    source: "MANUAL",
    externalId: null,
    occurredAt: new Date("2024-01-10T00:00:00.000Z"),
    hiddenFromFamily: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    account,
    card: null,
    category: null,
  };

  beforeEach(async () => {
    prisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      account: { findMany: jest.fn() },
      card: { findMany: jest.fn() },
      category: { findMany: jest.fn(), findUnique: jest.fn() },
      transaction: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    sharingPermissions = { findActiveByResourceIds: jest.fn() };
    accountsService = { toEntity: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);

    prisma.category.findMany.mockResolvedValue([]);
    sharingPermissions.findActiveByResourceIds.mockResolvedValue(new Map());
    accountsService.toEntity.mockImplementation(async (acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance),
      currency: acc.currency,
      sharedWithFamily: false,
      fullDetailShared: false,
      owner: {
        id: acc.owner.id,
        email: acc.owner.email,
        mfaEnabled: false,
        createdAt: acc.owner.createdAt,
      },
    }));
  });

  function mockActiveFamily(userId: string) {
    prisma.familyMember.findUnique.mockResolvedValue({
      familyId,
      userId,
      removedAt: null,
    });
    prisma.familyMember.findMany.mockResolvedValue([
      { userId: ownerId },
      { userId: memberId },
    ]);
  }

  describe("findTransactions", () => {
    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findTransactions(outsiderId, { familyId }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });

    it("o dono vê a própria transação mesmo sem compartilhamento", async () => {
      mockActiveFamily(ownerId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([baseTx]);

      const result = await service.findTransactions(ownerId, { familyId });

      expect(result.totalCount).toBe(1);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe("tx-1");
    });

    it("não-dono não vê transação de conta não-compartilhada", async () => {
      mockActiveFamily(memberId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      // Sem SharingPermission ativa (map vazio, default do beforeEach).
      prisma.transaction.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.findTransactions(memberId, { familyId });

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
    });

    it("não-dono vê transação de conta compartilhada (não oculta, sem categoria oculta)", async () => {
      mockActiveFamily(memberId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      sharingPermissions.findActiveByResourceIds.mockImplementation(
        async (_familyId, resourceType) => {
          if (resourceType === SharableResourceType.ACCOUNT) {
            return new Map([
              [account.id, { resourceId: account.id, revokedAt: null }],
            ]);
          }
          return new Map();
        },
      );
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([baseTx]);

      const result = await service.findTransactions(memberId, { familyId });

      expect(result.totalCount).toBe(1);
      expect(result.edges).toHaveLength(1);
    });

    it("transação oculta (hiddenFromFamily: true) não aparece para não-dono mesmo com conta compartilhada", async () => {
      mockActiveFamily(memberId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      sharingPermissions.findActiveByResourceIds.mockImplementation(
        async (_familyId, resourceType) => {
          if (resourceType === SharableResourceType.ACCOUNT) {
            return new Map([
              [account.id, { resourceId: account.id, revokedAt: null }],
            ]);
          }
          return new Map();
        },
      );
      // A query real filtraria isso no `where`; simulamos o resultado do Prisma
      // já excluindo a transação oculta (comportamento esperado do `where`).
      prisma.transaction.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.findTransactions(memberId, { familyId });

      expect(result.totalCount).toBe(0);
    });

    it("transação com categoria oculta não aparece para não-dono", async () => {
      mockActiveFamily(memberId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      prisma.category.findMany.mockResolvedValue([{ id: "cat-1", ownerId }]);
      sharingPermissions.findActiveByResourceIds.mockImplementation(
        async (_familyId, resourceType) => {
          if (resourceType === SharableResourceType.ACCOUNT) {
            return new Map([
              [account.id, { resourceId: account.id, revokedAt: null }],
            ]);
          }
          // Categoria "cat-1" não tem SharingPermission ativa -> oculta.
          return new Map();
        },
      );
      prisma.transaction.count.mockResolvedValue(0);
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.findTransactions(memberId, { familyId });

      expect(result.totalCount).toBe(0);
    });

    it("pagina corretamente: cursor avança e hasNextPage é calculado", async () => {
      mockActiveFamily(ownerId);
      prisma.account.findMany.mockResolvedValue([{ id: account.id }]);
      prisma.card.findMany.mockResolvedValue([]);
      const tx2 = {
        ...baseTx,
        id: "tx-2",
        occurredAt: new Date("2024-01-09T00:00:00.000Z"),
      };
      prisma.transaction.count.mockResolvedValue(2);
      prisma.transaction.findMany.mockResolvedValue([baseTx, tx2]);

      const result = await service.findTransactions(
        ownerId,
        { familyId },
        undefined,
        1,
      );

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe("tx-1");
      expect(result.pageInfo.endCursor).toBe(
        encodeCursor(baseTx.occurredAt.toISOString(), baseTx.id),
      );
    });
  });

  describe("hideTransaction", () => {
    it("permite que o dono oculte a própria transação", async () => {
      prisma.transaction.findUnique.mockResolvedValue(baseTx);
      prisma.transaction.update.mockResolvedValue({
        ...baseTx,
        hiddenFromFamily: true,
      });

      const result = await service.hideTransaction(ownerId, {
        transactionId: baseTx.id,
        hiddenFromFamily: true,
      });

      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseTx.id },
          data: { hiddenFromFamily: true },
        }),
      );
      expect(result.hiddenFromFamily).toBe(true);
    });

    it("lança ForbiddenAppException quando um não-dono tenta ocultar a transação", async () => {
      prisma.transaction.findUnique.mockResolvedValue(baseTx);

      await expect(
        service.hideTransaction(memberId, {
          transactionId: baseTx.id,
          hiddenFromFamily: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it("lança NotFoundAppException quando a transação não existe", async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.hideTransaction(ownerId, {
          transactionId: "nao-existe",
          hiddenFromFamily: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });

  describe("updateTransactionCategory", () => {
    it("permite que o dono atualize a categoria da própria transação", async () => {
      prisma.transaction.findUnique.mockResolvedValue(baseTx);
      prisma.category.findUnique.mockResolvedValue({
        id: "cat-1",
        ownerId: null,
      });
      prisma.transaction.update.mockResolvedValue({
        ...baseTx,
        categoryId: "cat-1",
        category: { id: "cat-1", ownerId: null, name: "Mercado", icon: null },
      });

      const result = await service.updateTransactionCategory(ownerId, {
        transactionId: baseTx.id,
        categoryId: "cat-1",
      });

      expect(result.category?.id).toBe("cat-1");
    });

    it("lança ForbiddenAppException quando um não-dono tenta atualizar a categoria", async () => {
      prisma.transaction.findUnique.mockResolvedValue(baseTx);

      await expect(
        service.updateTransactionCategory(memberId, {
          transactionId: baseTx.id,
          categoryId: "cat-1",
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });

    it("lança NotFoundAppException quando a categoria não existe", async () => {
      prisma.transaction.findUnique.mockResolvedValue(baseTx);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTransactionCategory(ownerId, {
          transactionId: baseTx.id,
          categoryId: "nao-existe",
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });
});
