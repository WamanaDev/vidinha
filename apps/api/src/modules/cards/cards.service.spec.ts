import { Test } from "@nestjs/testing";
import { CardsService } from "./cards.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { SupabaseStorageService } from "@modules/storage/storage.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { CardType, SharableResourceType } from "@prisma/client";

describe("CardsService", () => {
  let service: CardsService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    card: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    account: { findUnique: jest.Mock };
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

  const sharedCard = {
    id: "card-shared",
    ownerId,
    billingAccountId: null,
    type: CardType.CREDIT,
    brand: "VISA",
    name: "Cartão Compartilhado",
    lastFourDigits: "1234",
    creditLimit: "1000.00",
    currentInvoice: "200.00",
    isManual: false,
    archivedAt: null,
    owner,
  };

  const privateCard = {
    id: "card-private",
    ownerId,
    billingAccountId: null,
    type: CardType.CREDIT,
    brand: "MASTERCARD",
    name: "Cartão Privado",
    lastFourDigits: "5678",
    creditLimit: "2000.00",
    currentInvoice: "50.00",
    isManual: true,
    archivedAt: null,
    owner,
  };

  const syncedCard = {
    id: "card-synced",
    ownerId,
    billingAccountId: null,
    type: CardType.CREDIT,
    brand: "VISA",
    name: "Cartão Sincronizado",
    lastFourDigits: "9999",
    creditLimit: "3000.00",
    currentInvoice: "0.00",
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
      card: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      account: { findUnique: jest.fn() },
    };
    sharingPermissions = {
      findActiveByResourceIds: jest.fn(),
      upsertForResource: jest.fn(),
    };
    auditLog = { record: jest.fn() };
    storage = { resolveAvatarUrl: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CardsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
        { provide: AuditLogService, useValue: auditLog },
        { provide: SupabaseStorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(CardsService);
  });

  describe("findByFamily", () => {
    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.findByFamily(outsiderId, familyId),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });

    it("o dono vê os próprios cartões, compartilhados ou não", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: ownerId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: ownerId },
        { userId: memberId },
      ]);
      prisma.card.findMany.mockResolvedValue([sharedCard, privateCard]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(
        new Map([
          [
            "card-shared",
            {
              resourceId: "card-shared",
              revokedAt: null,
              allowFullDetail: false,
            },
          ],
        ]),
      );

      const result = await service.findByFamily(ownerId, familyId);

      expect(result).toHaveLength(2);
      const shared = result.find((c) => c.id === "card-shared")!;
      const priv = result.find((c) => c.id === "card-private")!;
      expect(shared.sharedWithFamily).toBe(true);
      expect(priv.sharedWithFamily).toBe(false);
      expect(priv.dueDate).toBeUndefined();
      expect(priv.limit).toBe(2000);
    });

    it("outro membro da família só vê os cartões compartilhados", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: memberId,
        familyId,
        removedAt: null,
      });
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: ownerId },
        { userId: memberId },
      ]);
      prisma.card.findMany.mockResolvedValue([sharedCard, privateCard]);
      sharingPermissions.findActiveByResourceIds.mockResolvedValue(
        new Map([
          [
            "card-shared",
            {
              resourceId: "card-shared",
              revokedAt: null,
              allowFullDetail: false,
            },
          ],
        ]),
      );

      const result = await service.findByFamily(memberId, familyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("card-shared");
    });

    it("não-membro não vê nenhum cartão", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: outsiderId,
        familyId,
        removedAt: new Date(),
      });

      await expect(
        service.findByFamily(outsiderId, familyId),
      ).rejects.toBeInstanceOf(NotFoundAppException);
      expect(prisma.card.findMany).not.toHaveBeenCalled();
    });
  });

  describe("updateSharing", () => {
    it("permite que o dono atualize o compartilhamento do próprio cartão", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      sharingPermissions.upsertForResource.mockResolvedValue({
        resourceId: privateCard.id,
        revokedAt: null,
        allowFullDetail: false,
      });

      const result = await service.updateSharing(ownerId, {
        cardId: privateCard.id,
        sharedWithFamily: true,
      });

      expect(sharingPermissions.upsertForResource).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: ownerId,
          ownerId,
          familyId,
          resourceType: SharableResourceType.CARD,
          resourceId: privateCard.id,
          sharedWithFamily: true,
          fullDetailShared: false,
        }),
      );
      expect(result.sharedWithFamily).toBe(true);
    });

    it("lança FORBIDDEN quando um não-dono tenta atualizar o compartilhamento", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);

      await expect(
        service.updateSharing(memberId, {
          cardId: privateCard.id,
          sharedWithFamily: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);

      expect(sharingPermissions.upsertForResource).not.toHaveBeenCalled();
    });

    it("lança NotFoundAppException quando o cartão não existe", async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSharing(ownerId, {
          cardId: "nao-existe",
          sharedWithFamily: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
    });
  });

  describe("create", () => {
    it("cria um cartão manual e audita o evento", async () => {
      prisma.familyMember.findUnique.mockResolvedValue({
        userId: ownerId,
        familyId,
        removedAt: null,
      });
      prisma.card.create.mockResolvedValue({ ...privateCard, owner });

      const result = await service.create(ownerId, {
        familyId,
        name: "Cartão Manual",
        type: CardType.CREDIT,
      });

      expect(prisma.card.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId,
            isManual: true,
            connectionId: null,
            currentInvoice: 0,
          }),
        }),
      );
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: ownerId, familyId }),
      );
      expect(result.id).toBe(privateCard.id);
    });

    it("lança NotFoundAppException quando o usuário não pertence à família", async () => {
      prisma.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.create(outsiderId, {
          familyId,
          name: "Cartão",
          type: CardType.CREDIT,
        }),
      ).rejects.toBeInstanceOf(NotFoundAppException);
      expect(prisma.card.create).not.toHaveBeenCalled();
    });
  });

  describe("updateManual", () => {
    it("permite que o dono edite um cartão manual", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.card.update.mockResolvedValue({
        ...privateCard,
        name: "Novo nome",
      });

      const result = await service.updateManual(ownerId, {
        id: privateCard.id,
        name: "Novo nome",
      });

      expect(result.name).toBe("Novo nome");
      expect(auditLog.record).toHaveBeenCalled();
    });

    it("rejeita editar um cartão sincronizado via Open Finance", async () => {
      prisma.card.findUnique.mockResolvedValue(syncedCard);

      await expect(
        service.updateManual(ownerId, {
          id: syncedCard.id,
          name: "Tentativa",
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
      expect(prisma.card.update).not.toHaveBeenCalled();
    });

    it("rejeita edição por quem não é dono", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);

      await expect(
        service.updateManual(outsiderId, {
          id: privateCard.id,
          name: "Tentativa",
        }),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });

  describe("archive", () => {
    it("arquiva um cartão manual do dono", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.card.update.mockResolvedValue({
        ...privateCard,
        archivedAt: new Date(),
      });

      const result = await service.archive(ownerId, privateCard.id);

      expect(result).toBe(true);
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: privateCard.id },
          data: expect.objectContaining({ archivedAt: expect.any(Date) }),
        }),
      );
      expect(auditLog.record).toHaveBeenCalled();
    });

    it("permite arquivar um cartão sincronizado via Open Finance (excluir um cartão específico sem desconectar a instituição)", async () => {
      prisma.card.findUnique.mockResolvedValue(syncedCard);
      prisma.familyMember.findFirst.mockResolvedValue({ familyId });
      prisma.card.update.mockResolvedValue({
        ...syncedCard,
        archivedAt: new Date(),
      });

      const result = await service.archive(ownerId, syncedCard.id);

      expect(result).toBe(true);
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: syncedCard.id },
          data: expect.objectContaining({ archivedAt: expect.any(Date) }),
        }),
      );
    });

    it("rejeita arquivar cartão de outro usuário", async () => {
      prisma.card.findUnique.mockResolvedValue(privateCard);

      await expect(
        service.archive(outsiderId, privateCard.id),
      ).rejects.toBeInstanceOf(ForbiddenAppException);
    });
  });
});
