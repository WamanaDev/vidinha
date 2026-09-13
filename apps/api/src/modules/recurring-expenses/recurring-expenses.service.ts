import { Injectable } from "@nestjs/common";
import {
  RecurrenceFrequency,
  RecurringExpense as PrismaRecurringExpense,
  Category as PrismaCategory,
  User as PrismaUser,
  Family as PrismaFamily,
  FamilyRole,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { CreateRecurringExpenseInput } from "./dto/create-recurring-expense.input";
import { UpdateRecurringExpenseInput } from "./dto/update-recurring-expense.input";
import { RecurringExpense } from "./entities/recurring-expense.entity";

type RecurringExpenseWithRelations = PrismaRecurringExpense & {
  createdBy: PrismaUser;
  family: PrismaFamily;
  category: PrismaCategory | null;
};

const MONTH_STEP_BY_FREQUENCY: Record<
  Exclude<RecurrenceFrequency, "WEEKLY">,
  number
> = {
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

/**
 * Autorização é resolvida com queries Prisma explícitas neste service, NÃO
 * via `AbilityFactory`/CASL — mesma convenção de `AccountsService`/
 * `TransactionsService`. Diferente de `Account`/`Card`, `RecurringExpense`
 * pertence diretamente a uma `Family` (`familyId`), sem conceito de "dono
 * privado com opt-in": qualquer membro ativo da família vê todas as despesas
 * recorrentes da família (ver SUPOSIÇÃO `sharedWithFamily` sempre `true` em
 * `entities/recurring-expense.entity.ts`). Só o `createdBy` (dono/criador)
 * pode editar/excluir.
 */
@Injectable()
export class RecurringExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFamily(
    userId: string,
    familyId: string,
  ): Promise<RecurringExpense[]> {
    await this.assertActiveFamilyMember(familyId, userId);

    const expenses = await this.prisma.recurringExpense.findMany({
      where: { familyId, archivedAt: null },
      include: { createdBy: true, family: true, category: true },
      orderBy: { createdAt: "desc" },
    });

    return expenses.map((e) => this.toEntity(e));
  }

  async create(
    userId: string,
    input: CreateRecurringExpenseInput,
  ): Promise<RecurringExpense> {
    await this.assertActiveFamilyMember(input.familyId, userId);

    if (input.categoryId) {
      await this.assertCategoryExists(input.categoryId);
    }

    const created = await this.prisma.recurringExpense.create({
      data: {
        familyId: input.familyId,
        createdById: userId,
        name: input.description,
        amount: input.amount,
        frequency: input.frequency,
        dueDay: input.dueDay,
        startDate: input.startDate,
        endDate: input.endDate,
        categoryId: input.categoryId,
      },
      include: { createdBy: true, family: true, category: true },
    });

    return this.toEntity(created);
  }

  /**
   * Só o criador (`createdBy`) pode editar. Checagem de posse no service
   * (não CASL), seguindo a mesma convenção de `AccountsService#updateSharing`.
   */
  async update(
    userId: string,
    input: UpdateRecurringExpenseInput,
  ): Promise<RecurringExpense> {
    const existing = await this.findOwnedOrThrow(input.id, userId);

    if (input.categoryId) {
      await this.assertCategoryExists(input.categoryId);
    }

    const updated = await this.prisma.recurringExpense.update({
      where: { id: existing.id },
      data: {
        name: input.description,
        amount: input.amount,
        frequency: input.frequency,
        dueDay: input.dueDay,
        startDate: input.startDate,
        endDate: input.endDate,
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
      include: { createdBy: true, family: true, category: true },
    });

    return this.toEntity(updated);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.findOwnedOrThrow(id, userId);

    await this.prisma.recurringExpense.delete({ where: { id: existing.id } });
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

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundAppException("Categoria não encontrada.");
    }
  }

  private async findOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<RecurringExpenseWithRelations> {
    const expense = await this.prisma.recurringExpense.findUnique({
      where: { id },
      include: { createdBy: true, family: true, category: true },
    });
    if (!expense) {
      throw new NotFoundAppException("Despesa recorrente não encontrada.");
    }
    if (expense.createdById !== userId) {
      throw new ForbiddenAppException(
        "Somente o criador da despesa recorrente pode executar esta ação.",
      );
    }
    return expense;
  }

  /**
   * Calcula a próxima ocorrência de vencimento a partir de `dueDay` +
   * `frequency` + `startDate` (e `endDate`, se aplicável). Não é uma
   * automação real (fica para um job futuro fora do escopo) — é apenas o
   * valor exibido ao usuário como "próximo vencimento estimado".
   *
   * SUPOSIÇÃO (interpretação de `dueDay`):
   * - Para `WEEKLY`, tratamos `dueDay` como dia da semana (1 = domingo, ...,
   *   7 = sábado, seguindo `Date#getDay()` + 1) — mais simples do que tratar
   *   como "dia do mês" para uma recorrência semanal, e é a interpretação que
   *   faz sentido de produto (aluguel semanal cai numa data fixa da semana).
   * - Para as demais frequências (MONTHLY/BIMONTHLY/QUARTERLY/SEMIANNUAL/
   *   ANNUAL), `dueDay` é o dia do mês (1-31, truncado ao último dia do mês
   *   quando o mês não tiver esse dia, ex.: dia 31 em fevereiro -> último dia
   *   de fevereiro), e a frequência define o passo de incremento de meses
   *   (1/2/3/6/12).
   * - Nunca retorna uma data anterior a `startDate`; se `endDate` já passou,
   *   retorna a última ocorrência antes de `endDate` (a despesa está
   *   encerrada, mas ainda precisamos de um valor determinístico).
   */
  computeNextDueDate(
    frequency: RecurrenceFrequency,
    dueDay: number,
    startDate: Date,
    endDate: Date | null,
    now: Date = new Date(),
  ): Date {
    const reference = now < startDate ? startDate : now;

    if (frequency === "WEEKLY") {
      const targetDow = ((dueDay - 1) % 7) + 1; // 1..7
      const candidate = new Date(reference);
      candidate.setHours(0, 0, 0, 0);
      const currentDow = candidate.getDay() + 1; // 1..7 (domingo=1)
      let diff = targetDow - currentDow;
      if (diff < 0 || (diff === 0 && candidate < startDate)) diff += 7;
      candidate.setDate(candidate.getDate() + diff);
      if (candidate < startDate) return this.clampToEnd(startDate, endDate);
      return this.clampToEnd(candidate, endDate);
    }

    const step = MONTH_STEP_BY_FREQUENCY[frequency];
    let candidate = this.buildMonthlyOccurrence(
      reference.getFullYear(),
      reference.getMonth(),
      dueDay,
    );
    while (candidate < reference) {
      const next = new Date(candidate);
      next.setMonth(next.getMonth() + step);
      candidate = this.buildMonthlyOccurrence(
        next.getFullYear(),
        next.getMonth(),
        dueDay,
      );
    }
    if (candidate < startDate) {
      candidate = this.buildMonthlyOccurrence(
        startDate.getFullYear(),
        startDate.getMonth(),
        dueDay,
      );
    }
    return this.clampToEnd(candidate, endDate);
  }

  private buildMonthlyOccurrence(
    year: number,
    month: number,
    dueDay: number,
  ): Date {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(dueDay, lastDayOfMonth);
    return new Date(year, month, day);
  }

  private clampToEnd(candidate: Date, endDate: Date | null): Date {
    if (endDate && candidate > endDate) return endDate;
    return candidate;
  }

  private toEntity(expense: RecurringExpenseWithRelations): RecurringExpense {
    return {
      id: expense.id,
      // SUPOSIÇÃO: `Family` embutido de forma mínima (mesma convenção
      // conservadora de `sharing-permissions.service.ts#toEntity`), sem
      // popular `members` (evitaria uma segunda consulta recursiva).
      family: {
        id: expense.family.id,
        name: expense.family.name,
        createdAt: expense.family.createdAt,
        members: [],
        myRole: FamilyRole.MEMBER,
      },
      description: expense.name,
      amount: Number(expense.amount),
      frequency: expense.frequency,
      nextDueDate: this.computeNextDueDate(
        expense.frequency,
        expense.dueDay,
        expense.startDate,
        expense.endDate,
      ),
      category: expense.category
        ? {
            id: expense.category.id,
            name: expense.category.name,
            icon: expense.category.icon ?? undefined,
            // SUPOSIÇÃO: aqui não resolvemos `hiddenFromFamily` real (exigiria
            // consultar `SharingPermission` como em `transactions.service.ts`)
            // — comportamento mais simples e conservador, fora do escopo
            // central desta entidade (o campo relevante de `RecurringExpense`
            // é a categoria em si, não sua visibilidade em lote).
            hiddenFromFamily: false,
            isDefault: expense.category.ownerId === null,
          }
        : undefined,
      // SUPOSIÇÃO: sempre `true` — ver justificativa no cabeçalho da entity.
      sharedWithFamily: true,
      owner: {
        id: expense.createdBy.id,
        email: expense.createdBy.email,
        displayName: expense.createdBy.displayName ?? undefined,
        avatarUrl: expense.createdBy.avatarUrl ?? undefined,
        mfaEnabled: false,
        createdAt: expense.createdBy.createdAt,
      },
    };
  }
}
