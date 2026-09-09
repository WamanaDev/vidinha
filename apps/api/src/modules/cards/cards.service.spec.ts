import { Test } from "@nestjs/testing";
import { CardsService } from "./cards.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
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
    card: { findMany: jest.Mock; findUnique: jest.Mock };
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
      card: { findMany: jest.fn(), findUnique: jest.fn() },
    };
    sharingPermissions = {
      findActiveByResourceIds: jest.fn(),
      upsertForResource: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CardsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SharingPermissionsService, useValue: sharingPermissions },
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
});
