import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { RecurringExpensesService } from "./recurring-expenses.service";
import { CreateRecurringExpenseInput } from "./dto/create-recurring-expense.input";
import { UpdateRecurringExpenseInput } from "./dto/update-recurring-expense.input";
import { RecurringExpense } from "./entities/recurring-expense.entity";

/**
 * Sem `PoliciesGuard`/`@CheckAbility()` aqui: autorização de leitura e
 * checagem de posse são resolvidas dentro do `RecurringExpensesService` com
 * queries Prisma explícitas — mesma convenção de `AccountsResolver`.
 */
@Resolver(() => RecurringExpense)
export class RecurringExpensesResolver {
  constructor(
    private readonly recurringExpensesService: RecurringExpensesService,
  ) {}

  @Query(() => [RecurringExpense])
  async recurringExpenses(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<RecurringExpense[]> {
    return this.recurringExpensesService.findByFamily(user.userId, familyId);
  }

  @Mutation(() => RecurringExpense)
  async createRecurringExpense(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateRecurringExpenseInput,
  ): Promise<RecurringExpense> {
    return this.recurringExpensesService.create(user.userId, input);
  }

  @Mutation(() => RecurringExpense)
  async updateRecurringExpense(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateRecurringExpenseInput,
  ): Promise<RecurringExpense> {
    return this.recurringExpensesService.update(user.userId, input);
  }

  @Mutation(() => Boolean)
  async deleteRecurringExpense(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.recurringExpensesService.delete(user.userId, id);
  }
}
