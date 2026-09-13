import { Injectable } from "@nestjs/common";
import {
  SharableResourceType,
  Category as PrismaCategory,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
  ConflictAppException,
} from "@common/errors/app.exceptions";
import { CreateCategoryInput } from "./dto/create-category.input";
import { UpdateCategoryInput } from "./dto/update-category.input";
import { Category } from "@modules/transactions/entities/category.entity";

/**
 * Módulo "dono" do type GraphQL `Category` (reutiliza a MESMA classe de
 * entity de `@modules/transactions/entities/category.entity`, ver
 * cabeçalho daquele arquivo — dois `@ObjectType('Category')` distintos
 * quebrariam o schema). Autorização resolvida com queries Prisma explícitas
 * neste service, NÃO via `AbilityFactory`/CASL — mesma convenção de
 * `AccountsService`/`TransactionsService`.
 *
 * SUPOSIÇÃO (modelo de posse): o schema Prisma não liga `Category` a uma
 * `Family` diretamente, só a um `User` opcional (`ownerId`, nulo = catálogo
 * global). Ao criar uma categoria customizada, o usuário autenticado se torna
 * o `ownerId` (mesmo padrão de posse individual de `Account`/`Card`), e
 * `familyId` no input serve só para validar que o usuário pertence a uma
 * família ativa (pré-requisito de produto) e para resolver a
 * `SharingPermission` de `hiddenFromFamily`. "Categorias da própria família"
 * (para fins de editar/excluir) é interpretado, de forma conservadora, como
 * "categorias cujo dono é o próprio usuário autenticado" — mesma regra de
 * posse individual usada por `AccountsService#updateSharing`.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharingPermissions: SharingPermissionsService,
  ) {}

  /**
   * Lista as categorias disponíveis para uma família: o catálogo global
   * (`ownerId: null`) mais as categorias customizadas de qualquer membro
   * ativo da família. SUPOSIÇÃO: diferente da visibilidade de `Transaction`
   * (que oculta categorias com `hiddenFromFamily: true` de não-donos), esta
   * query é a tela de GESTÃO de categorias — todos os membros veem todas as
   * categorias da família (inclusive as ocultas), só não veem categorias de
   * OUTRAS famílias. O campo `hiddenFromFamily` no retorno ainda reflete o
   * estado real, para o client exibir o toggle corretamente.
   */
  async findByFamily(userId: string, familyId: string): Promise<Category[]> {
    await this.assertActiveFamilyMember(familyId, userId);

    const memberIds = (
      await this.prisma.familyMember.findMany({
        where: { familyId, removedAt: null },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const categories = await this.prisma.category.findMany({
      where: { OR: [{ ownerId: null }, { ownerId: { in: memberIds } }] },
      orderBy: { name: "asc" },
    });

    const ownedCategoryIds = categories
      .filter((c) => c.ownerId !== null)
      .map((c) => c.id);
    const activePermissions =
      await this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.CATEGORY,
        ownedCategoryIds,
      );

    return categories.map((c) => this.toEntity(c, activePermissions.has(c.id)));
  }

  async create(userId: string, input: CreateCategoryInput): Promise<Category> {
    await this.assertActiveFamilyMember(input.familyId, userId);

    const created = await this.prisma.category.create({
      data: {
        ownerId: userId,
        name: input.name,
        icon: input.icon,
      },
    });

    return this.toEntity(created, false);
  }

  /**
   * Só o dono pode editar. Categorias do catálogo global (`ownerId: null`)
   * não são editáveis por usuários finais. `hiddenFromFamily` é escrito
   * invertendo a semântica de `SharingPermission` (ver
   * `entities/category.entity.ts`): `hiddenFromFamily: true` -> nenhuma
   * permissão ativa (revogada/inexistente); `hiddenFromFamily: false` ->
   * permissão ativa criada/mantida.
   */
  async update(userId: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.findOwnedOrThrow(input.id, userId);

    const updated = await this.prisma.category.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        icon: input.icon,
      },
    });

    let hiddenFromFamily: boolean;
    if (input.hiddenFromFamily !== undefined) {
      const familyId = await this.resolveOwnerFamilyId(userId);
      await this.sharingPermissions.upsertForResource({
        actorId: userId,
        ownerId: userId,
        familyId,
        resourceType: SharableResourceType.CATEGORY,
        resourceId: existing.id,
        // SUPOSIÇÃO/inversão documentada: `sharedWithFamily: true` (permissão
        // ativa) significa "NÃO oculta" (hiddenFromFamily: false).
        sharedWithFamily: !input.hiddenFromFamily,
      });
      hiddenFromFamily = input.hiddenFromFamily;
    } else {
      const familyId = await this.resolveOwnerFamilyId(userId);
      const permissions = await this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.CATEGORY,
        [existing.id],
      );
      hiddenFromFamily = !permissions.has(existing.id);
    }

    return this.toEntity(updated, !hiddenFromFamily);
  }

  /**
   * Bloqueia a exclusão (fail secure, `CLAUDE.md §55`) se houver transações
   * ou despesas recorrentes vinculadas à categoria — SUPOSIÇÃO já sinalizada
   * como "a validar" na própria spec (categories.module.md §2).
   */
  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.findOwnedOrThrow(id, userId);

    const [transactionCount, recurringExpenseCount] = await Promise.all([
      this.prisma.transaction.count({ where: { categoryId: existing.id } }),
      this.prisma.recurringExpense.count({
        where: { categoryId: existing.id },
      }),
    ]);

    if (transactionCount > 0 || recurringExpenseCount > 0) {
      throw new ConflictAppException(
        "Não é possível excluir uma categoria com transações ou despesas recorrentes vinculadas.",
      );
    }

    await this.prisma.category.delete({ where: { id: existing.id } });
    return true;
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

  private async findOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<PrismaCategory> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundAppException("Categoria não encontrada.");
    }
    if (category.ownerId === null) {
      throw new ForbiddenAppException(
        "Categorias do catálogo global não podem ser editadas ou excluídas.",
      );
    }
    if (category.ownerId !== userId) {
      throw new ForbiddenAppException(
        "Somente o dono da categoria pode executar esta ação.",
      );
    }
    return category;
  }

  /**
   * SUPOSIÇÃO: idêntica à de `accounts.service.ts#resolveOwnerFamilyId` —
   * assume a primeira família ativa do dono (modelo atual: um usuário
   * pertence a uma única família).
   */
  private async resolveOwnerFamilyId(userId: string): Promise<string> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, removedAt: null },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      throw new ForbiddenAppException(
        "Você precisa pertencer a uma família para gerenciar categorias.",
      );
    }
    return membership.familyId;
  }

  private toEntity(
    category: PrismaCategory,
    hasActivePermission: boolean,
  ): Category {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon ?? undefined,
      hiddenFromFamily:
        category.ownerId !== null ? !hasActivePermission : false,
      isDefault: category.ownerId === null,
    };
  }
}
