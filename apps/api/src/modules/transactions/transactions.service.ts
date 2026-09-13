import { Injectable } from "@nestjs/common";
import {
  Prisma,
  SharableResourceType,
  SharingPermission as PrismaSharingPermission,
  Transaction as PrismaTransaction,
  Category as PrismaCategory,
  Account as PrismaAccount,
  Card as PrismaCard,
  User as PrismaUser,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import { AccountsService } from "@modules/accounts/accounts.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { OrderDirection } from "@common/types/order-direction.enum";
import { encodeCursor, decodeCursor } from "@common/types/cursor.scalar";
import { TransactionFilterInput } from "./dto/transaction-filter.input";
import {
  TransactionOrderInput,
  TransactionOrderField,
} from "./dto/transaction-order.input";
import { HideTransactionInput } from "./dto/hide-transaction.input";
import { UpdateTransactionCategoryInput } from "./dto/update-transaction-category.input";
import { Transaction } from "./entities/transaction.entity";
import { TransactionConnection } from "./entities/transaction-connection.entity";
import { Category } from "./entities/category.entity";

type TransactionWithRelations = PrismaTransaction & {
  account: (PrismaAccount & { owner: PrismaUser }) | null;
  card: (PrismaCard & { owner: PrismaUser }) | null;
  category: PrismaCategory | null;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Autorização de leitura (`transactions(filter)`) e a checagem de posse em
 * `hideTransaction`/`updateTransactionCategory` são resolvidas com queries
 * Prisma explícitas neste service, NÃO via `AbilityFactory`/CASL — mesma
 * convenção de `AccountsService`/`CardsService` (ver justificativa completa
 * no cabeçalho de `accounts.service.ts`).
 *
 * SUPOSIÇÃO: a spec (transactions.module.md) recomenda `@casl/prisma`
 * (`accessibleBy(ability)`) para traduzir a regra de visibilidade
 * diretamente em `where` do Prisma, mas esse pacote NÃO está instalado no
 * projeto. Implementamos a regra com uma cláusula `where` do Prisma montada
 * manualmente (ver `buildVisibilityWhere`), evitando tanto instalar uma nova
 * dependência quanto buscar todas as transações para filtrar em memória.
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharingPermissions: SharingPermissionsService,
    private readonly accountsService: AccountsService,
  ) {}

  /**
   * Lista as transações visíveis ao usuário dentro de uma família, com
   * paginação cursor-based estilo Relay. Regra de visibilidade (ABAC) — dono
   * sempre lê a própria transação; um não-dono só lê a transação se TODAS as
   * condições forem verdadeiras: (a) a conta OU o cartão associado tem
   * `SharingPermission` ativa; (b) `Transaction.hiddenFromFamily === false`;
   * (c) a categoria da transação (se houver) não está oculta da família (ver
   * `entities/category.entity.ts`). Montada como cláusula `where` do Prisma
   * (não busca tudo e filtra em memória) — só os conjuntos de IDs
   * compartilhados (pequenos, por natureza) são pré-resolvidos antes da
   * query principal.
   */
  async findTransactions(
    userId: string,
    filter: TransactionFilterInput,
    orderBy?: TransactionOrderInput,
    first?: number,
    after?: string,
  ): Promise<TransactionConnection> {
    const memberIds = await this.assertActiveFamilyMemberAndGetMembers(
      filter.familyId,
      userId,
    );

    const field = orderBy?.field ?? TransactionOrderField.DATE;
    const direction = orderBy?.direction ?? OrderDirection.DESC;
    const take =
      first && first > 0 ? Math.min(first, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    const [{ sharedAccountIds, sharedCardIds }, visibleCategoryIds] =
      await Promise.all([
        this.resolveSharedResourceIds(filter.familyId, memberIds),
        this.resolveVisibleCategoryIds(filter.familyId, memberIds),
      ]);

    const visibilityWhere: Prisma.TransactionWhereInput = {
      OR: [
        { account: { ownerId: userId } },
        { card: { ownerId: userId } },
        {
          AND: [
            { hiddenFromFamily: false },
            {
              OR: [
                { accountId: { in: sharedAccountIds } },
                { cardId: { in: sharedCardIds } },
              ],
            },
            {
              OR: [
                { categoryId: null },
                { categoryId: { in: visibleCategoryIds } },
              ],
            },
          ],
        },
      ],
    };

    const filterWhere = this.buildFilterWhere(filter);
    const cursorWhere = after
      ? this.buildCursorWhere(after, field, direction)
      : {};

    const where: Prisma.TransactionWhereInput = {
      AND: [visibilityWhere, filterWhere, cursorWhere],
    };

    const orderByPrisma: Prisma.TransactionOrderByWithRelationInput[] =
      field === TransactionOrderField.AMOUNT
        ? [
            { amount: direction === OrderDirection.ASC ? "asc" : "desc" },
            { id: direction === OrderDirection.ASC ? "asc" : "desc" },
          ]
        : [
            { occurredAt: direction === OrderDirection.ASC ? "asc" : "desc" },
            { id: direction === OrderDirection.ASC ? "asc" : "desc" },
          ];

    const [totalCount, rows] = await Promise.all([
      this.prisma.transaction.count({
        where: { AND: [visibilityWhere, filterWhere] },
      }),
      this.prisma.transaction.findMany({
        where,
        orderBy: orderByPrisma,
        take: take + 1,
        include: {
          account: { include: { owner: true } },
          card: { include: { owner: true } },
          category: true,
        },
      }),
    ]);

    const hasNextPage = rows.length > take;
    const page = hasNextPage ? rows.slice(0, take) : rows;

    const categoryHiddenMap = await this.resolveCategoryHiddenMap(
      filter.familyId,
      page.map((tx) => tx.category).filter((c): c is PrismaCategory => !!c),
    );

    const accountIds = page
      .map((tx) => tx.account?.id)
      .filter((id): id is string => !!id);
    const cardIds = page
      .map((tx) => tx.card?.id)
      .filter((id): id is string => !!id);
    const [accountPermissions, cardPermissions] = await Promise.all([
      this.sharingPermissions.findActiveByResourceIds(
        filter.familyId,
        SharableResourceType.ACCOUNT,
        accountIds,
      ),
      this.sharingPermissions.findActiveByResourceIds(
        filter.familyId,
        SharableResourceType.CARD,
        cardIds,
      ),
    ]);

    const edges = await Promise.all(
      page.map(async (tx) => {
        const node = await this.toEntity(
          tx,
          categoryHiddenMap,
          accountPermissions,
          cardPermissions,
        );
        const cursorValue =
          field === TransactionOrderField.AMOUNT
            ? tx.amount.toString()
            : tx.occurredAt.toISOString();
        return { cursor: encodeCursor(cursorValue, tx.id), node };
      }),
    );

    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges.at(0)?.cursor,
        endCursor: edges.at(-1)?.cursor,
      },
    };
  }

  /**
   * Marca/desmarca `hiddenFromFamily` de uma transação. Só o dono (dono da
   * conta ou do cartão associado) pode executar. Não é um evento auditado
   * (00-DECISIONS.md §9 não lista alteração de `hiddenFromFamily`/categoria).
   */
  async hideTransaction(
    userId: string,
    input: HideTransactionInput,
  ): Promise<Transaction> {
    const tx = await this.findOwnedTransactionOrThrow(
      input.transactionId,
      userId,
    );

    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { hiddenFromFamily: input.hiddenFromFamily },
      include: {
        account: { include: { owner: true } },
        card: { include: { owner: true } },
        category: true,
      },
    });

    return this.toSingleEntity(updated);
  }

  /**
   * Atualiza a categoria de uma transação. Só o dono pode executar. Não
   * valida se a categoria pertence ao dono/sistema além de existir —
   * SUPOSIÇÃO: a spec não detalha essa regra; validamos apenas existência,
   * comportamento mais simples e conservador.
   */
  async updateTransactionCategory(
    userId: string,
    input: UpdateTransactionCategoryInput,
  ): Promise<Transaction> {
    const tx = await this.findOwnedTransactionOrThrow(
      input.transactionId,
      userId,
    );

    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new NotFoundAppException("Categoria não encontrada.");
    }

    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { categoryId: input.categoryId },
      include: {
        account: { include: { owner: true } },
        card: { include: { owner: true } },
        category: true,
      },
    });

    return this.toSingleEntity(updated);
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async assertActiveFamilyMemberAndGetMembers(
    familyId: string,
    userId: string,
  ): Promise<string[]> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      throw new NotFoundAppException("Família não encontrada.");
    }

    const members = await this.prisma.familyMember.findMany({
      where: { familyId, removedAt: null },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  /**
   * Resolve os IDs de contas/cartões (dos membros da família) com
   * `SharingPermission` ativa — conjuntos pequenos usados na cláusula `where`
   * da query principal de transações (nunca busca as transações em si).
   */
  private async resolveSharedResourceIds(
    familyId: string,
    memberIds: string[],
  ): Promise<{ sharedAccountIds: string[]; sharedCardIds: string[] }> {
    const [accounts, cards] = await Promise.all([
      this.prisma.account.findMany({
        where: { ownerId: { in: memberIds } },
        select: { id: true },
      }),
      this.prisma.card.findMany({
        where: { ownerId: { in: memberIds } },
        select: { id: true },
      }),
    ]);

    const [accountPermissions, cardPermissions] = await Promise.all([
      this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.ACCOUNT,
        accounts.map((a) => a.id),
      ),
      this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.CARD,
        cards.map((c) => c.id),
      ),
    ]);

    return {
      sharedAccountIds: [...accountPermissions.keys()],
      sharedCardIds: [...cardPermissions.keys()],
    };
  }

  /**
   * Resolve os IDs de categoria visíveis à família: categorias padrão do
   * sistema (`ownerId: null`) são sempre visíveis; categorias de um membro
   * só são visíveis se tiverem `SharingPermission` ativa (scope `CATEGORY`) —
   * ver SUPOSIÇÃO documentada em `entities/category.entity.ts`.
   */
  private async resolveVisibleCategoryIds(
    familyId: string,
    memberIds: string[],
  ): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      where: { OR: [{ ownerId: null }, { ownerId: { in: memberIds } }] },
      select: { id: true, ownerId: true },
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

    return categories
      .filter((c) => c.ownerId === null || activePermissions.has(c.id))
      .map((c) => c.id);
  }

  /**
   * Igual a `resolveVisibleCategoryIds`, mas retorna um mapa `categoryId ->
   * hiddenFromFamily` apenas para as categorias efetivamente presentes na
   * página de transações corrente (evita N+1: uma única consulta em lote de
   * `SharingPermission` por página, não por transação).
   */
  private async resolveCategoryHiddenMap(
    familyId: string,
    categories: PrismaCategory[],
  ): Promise<Map<string, boolean>> {
    const ownedCategoryIds = categories
      .filter((c) => c.ownerId !== null)
      .map((c) => c.id);
    const activePermissions =
      await this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.CATEGORY,
        ownedCategoryIds,
      );

    const map = new Map<string, boolean>();
    for (const category of categories) {
      map.set(
        category.id,
        category.ownerId !== null && !activePermissions.has(category.id),
      );
    }
    return map;
  }

  private buildFilterWhere(
    filter: TransactionFilterInput,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.cardId) where.cardId = filter.cardId;
    if (filter.categoryId) where.categoryId = filter.categoryId;

    if (filter.fromDate || filter.toDate) {
      where.occurredAt = {
        ...(filter.fromDate ? { gte: filter.fromDate } : {}),
        ...(filter.toDate ? { lte: filter.toDate } : {}),
      };
    }

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.amount = {
        ...(filter.minAmount !== undefined ? { gte: filter.minAmount } : {}),
        ...(filter.maxAmount !== undefined ? { lte: filter.maxAmount } : {}),
      };
    }

    return where;
  }

  /**
   * Cursor-based pagination estilo Relay, usando `occurredAt`+`id` (ou
   * `amount`+`id`) como chave de ordenação estável — o desempate por `id`
   * evita ambiguidade quando dois registros têm o mesmo valor no campo
   * primário de ordenação.
   */
  private buildCursorWhere(
    after: string,
    field: TransactionOrderField,
    direction: OrderDirection,
  ): Prisma.TransactionWhereInput {
    const { value, id } = decodeCursor(after);
    const isForward = direction === OrderDirection.ASC;
    const op = isForward ? "gt" : "lt";

    if (field === TransactionOrderField.AMOUNT) {
      const amount = new Prisma.Decimal(value);
      return {
        OR: [{ amount: { [op]: amount } }, { amount, id: { [op]: id } }],
      };
    }

    const occurredAt = new Date(value);
    return {
      OR: [
        { occurredAt: { [op]: occurredAt } },
        { occurredAt, id: { [op]: id } },
      ],
    };
  }

  private async findOwnedTransactionOrThrow(
    transactionId: string,
    userId: string,
  ): Promise<TransactionWithRelations> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        account: { include: { owner: true } },
        card: { include: { owner: true } },
        category: true,
      },
    });
    if (!tx) {
      throw new NotFoundAppException("Transação não encontrada.");
    }

    const ownerId = tx.account?.ownerId ?? tx.card?.ownerId;
    if (ownerId !== userId) {
      throw new ForbiddenAppException(
        "Somente o dono da transação pode executar esta ação.",
      );
    }
    return tx;
  }

  private async toSingleEntity(
    tx: TransactionWithRelations,
  ): Promise<Transaction> {
    const familyOwnerId = tx.account?.ownerId ?? tx.card?.ownerId;
    const familyId = familyOwnerId
      ? await this.resolveOwnerFamilyId(familyOwnerId)
      : undefined;

    const categoryHiddenMap = familyId
      ? await this.resolveCategoryHiddenMap(
          familyId,
          tx.category ? [tx.category] : [],
        )
      : new Map<string, boolean>();

    const accountPermissions = familyId
      ? await this.sharingPermissions.findActiveByResourceIds(
          familyId,
          SharableResourceType.ACCOUNT,
          tx.account ? [tx.account.id] : [],
        )
      : new Map<string, PrismaSharingPermission>();

    const cardPermissions = familyId
      ? await this.sharingPermissions.findActiveByResourceIds(
          familyId,
          SharableResourceType.CARD,
          tx.card ? [tx.card.id] : [],
        )
      : new Map<string, PrismaSharingPermission>();

    return this.toEntity(
      tx,
      categoryHiddenMap,
      accountPermissions,
      cardPermissions,
    );
  }

  /**
   * SUPOSIÇÃO: idêntica à de `accounts.service.ts#resolveOwnerFamilyId` —
   * assume a primeira família ativa do dono (modelo atual: um usuário
   * pertence a uma única família).
   */
  private async resolveOwnerFamilyId(
    userId: string,
  ): Promise<string | undefined> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, removedAt: null },
      orderBy: { joinedAt: "asc" },
    });
    return membership?.familyId;
  }

  private async toEntity(
    tx: TransactionWithRelations,
    categoryHiddenMap: Map<string, boolean>,
    accountPermissions: Map<string, PrismaSharingPermission>,
    cardPermissions: Map<string, PrismaSharingPermission>,
  ): Promise<Transaction> {
    const owner = tx.account?.owner ?? tx.card?.owner;

    return {
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount),
      // SUPOSIÇÃO/mapeamento explícito: SDL pede `date`, Prisma tem `occurredAt`.
      date: tx.occurredAt,
      account: tx.account
        ? await this.accountsService.toEntity(
            tx.account,
            accountPermissions.get(tx.account.id),
          )
        : undefined,
      card: tx.card ? this.toCardEntity(tx.card, cardPermissions) : undefined,
      category: tx.category
        ? this.toCategoryEntity(tx.category, categoryHiddenMap)
        : undefined,
      hiddenFromFamily: tx.hiddenFromFamily,
      owner: owner
        ? {
            id: owner.id,
            email: owner.email,
            displayName: owner.displayName ?? undefined,
            avatarUrl: owner.avatarUrl ?? undefined,
            mfaEnabled: false,
            createdAt: owner.createdAt,
          }
        : ({} as Transaction["owner"]),
    };
  }

  /**
   * `CardsService#toEntity` é privado (não reexposto para reuso entre
   * módulos) — replicamos aqui um mapeamento mínimo de `Card` em vez de
   * alterar o módulo `cards` (fora do escopo desta tarefa). Mantém a mesma
   * convenção de `sharedWithFamily` usada por `cards.service.ts#toEntity`.
   */
  private toCardEntity(
    card: PrismaCard & { owner: PrismaUser },
    cardPermissions: Map<string, PrismaSharingPermission>,
  ) {
    const permission = cardPermissions.get(card.id);
    return {
      id: card.id,
      name: card.name,
      lastFourDigits: card.lastFourDigits ?? undefined,
      limit: card.creditLimit !== null ? Number(card.creditLimit) : undefined,
      currentInvoice:
        card.currentInvoice !== null ? Number(card.currentInvoice) : undefined,
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

  private toCategoryEntity(
    category: PrismaCategory,
    categoryHiddenMap: Map<string, boolean>,
  ): Category {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon ?? undefined,
      hiddenFromFamily: categoryHiddenMap.get(category.id) ?? false,
      isDefault: category.ownerId === null,
    };
  }
}
