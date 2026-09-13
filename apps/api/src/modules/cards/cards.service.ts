import { Injectable } from "@nestjs/common";
import {
  SharableResourceType,
  SharingPermission as PrismaSharingPermission,
  Card as PrismaCard,
  User as PrismaUser,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { UpdateCardSharingInput } from "./dto/update-card-sharing.input";
import { Card } from "./entities/card.entity";

type CardWithOwner = PrismaCard & { owner: PrismaUser };

/**
 * Mesma convenção de autorização de `accounts.service.ts`: leitura
 * (`cards(familyId)`) e checagem de posse em `updateCardSharing` são feitas
 * com queries Prisma explícitas aqui, não via CASL — ver justificativa em
 * `accounts.service.ts`.
 */
@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharingPermissions: SharingPermissionsService,
  ) {}

  /**
   * Lista os cartões visíveis ao usuário dentro de uma família: o dono
   * sempre vê os próprios cartões; os demais membros ativos da família só
   * veem cartões com `SharingPermission` ativa (`resourceType: 'CARD'`,
   * `revokedAt: null`).
   */
  async findByFamily(userId: string, familyId: string): Promise<Card[]> {
    await this.assertActiveFamilyMember(familyId, userId);

    const memberIds = (
      await this.prisma.familyMember.findMany({
        where: { familyId, removedAt: null },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const cards = await this.prisma.card.findMany({
      where: { ownerId: { in: memberIds }, archivedAt: null },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });

    const permissionsByCardId =
      await this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.CARD,
        cards.map((c) => c.id),
      );

    const visible = cards.filter(
      (c) => c.ownerId === userId || permissionsByCardId.has(c.id),
    );

    return visible.map((c) => this.toEntity(c, permissionsByCardId.get(c.id)));
  }

  /**
   * Atualiza `sharedWithFamily` de um cartão via upsert do
   * `SharingPermission` correspondente (reusa
   * `SharingPermissionsService#upsertForResource`). Só o dono do cartão pode
   * executar esta mutation. `Card` não tem `fullDetailShared` próprio (ver
   * nota em `entities/card.entity.ts`), então sempre passamos
   * `fullDetailShared: false` ao upsert — o detalhe de compras do cartão é
   * controlado pelo `fullDetailShared` da conta de fatura associada, não por
   * este `SharingPermission` de escopo `CARD`.
   */
  async updateSharing(
    userId: string,
    input: UpdateCardSharingInput,
  ): Promise<Card> {
    const card = await this.findOwnedCardOrThrow(input.cardId, userId);

    const familyId = await this.resolveOwnerFamilyId(userId);

    const permission = await this.sharingPermissions.upsertForResource({
      actorId: userId,
      ownerId: userId,
      familyId,
      resourceType: SharableResourceType.CARD,
      resourceId: card.id,
      sharedWithFamily: input.sharedWithFamily,
      fullDetailShared: false,
    });

    return this.toEntity(card, permission);
  }

  private toEntity(
    card: CardWithOwner,
    permission?: PrismaSharingPermission,
  ): Card {
    return {
      id: card.id,
      name: card.name,
      lastFourDigits: card.lastFourDigits ?? undefined,
      limit: card.creditLimit !== null ? Number(card.creditLimit) : undefined,
      currentInvoice:
        card.currentInvoice !== null ? Number(card.currentInvoice) : undefined,
      // SUPOSIÇÃO: `Card` (specs/data-model/schema.prisma) não tem campo de
      // data de vencimento de fatura — sempre `null` aqui (ver
      // entities/card.entity.ts).
      dueDate: undefined,
      sharedWithFamily: permission ? permission.revokedAt === null : false,
      owner: {
        id: card.owner.id,
        email: card.owner.email,
        displayName: card.owner.displayName ?? undefined,
        avatarUrl: card.owner.avatarUrl ?? undefined,
        mfaEnabled: false,
        createdAt: card.owner.createdAt,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

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

  private async findOwnedCardOrThrow(
    cardId: string,
    userId: string,
  ): Promise<CardWithOwner> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { owner: true },
    });
    if (!card) {
      throw new NotFoundAppException("Cartão não encontrado.");
    }
    if (card.ownerId !== userId) {
      throw new ForbiddenAppException(
        "Somente o dono do cartão pode alterar o compartilhamento.",
      );
    }
    return card;
  }

  /**
   * SUPOSIÇÃO: idêntica à de `accounts.service.ts#resolveOwnerFamilyId` —
   * `UpdateCardSharingInput` não recebe `familyId`; assumimos a primeira
   * família ativa do dono.
   */
  private async resolveOwnerFamilyId(userId: string): Promise<string> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, removedAt: null },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      throw new ForbiddenAppException(
        "Você precisa pertencer a uma família para compartilhar cartões.",
      );
    }
    return membership.familyId;
  }
}
