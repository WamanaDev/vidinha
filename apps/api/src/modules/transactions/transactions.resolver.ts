import { Resolver, Query, Mutation, Args, Int } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { GraphQLCursor } from "@common/types/cursor.scalar";
import { TransactionsService } from "./transactions.service";
import { TransactionFilterInput } from "./dto/transaction-filter.input";
import { TransactionOrderInput } from "./dto/transaction-order.input";
import { HideTransactionInput } from "./dto/hide-transaction.input";
import { UpdateTransactionCategoryInput } from "./dto/update-transaction-category.input";
import { Transaction } from "./entities/transaction.entity";
import { TransactionConnection } from "./entities/transaction-connection.entity";

/**
 * Sem `PoliciesGuard`/`@CheckAbility()` aqui: a autorização de leitura e a
 * checagem de posse das mutations são resolvidas dentro do
 * `TransactionsService` com queries Prisma explícitas — ver justificativa no
 * cabeçalho de `transactions.service.ts`.
 */
@Resolver(() => Transaction)
export class TransactionsResolver {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Query(() => TransactionConnection)
  async transactions(
    @CurrentUser() user: AuthUser,
    @Args("filter") filter: TransactionFilterInput,
    @Args("orderBy", { type: () => TransactionOrderInput, nullable: true })
    orderBy?: TransactionOrderInput,
    @Args("first", { type: () => Int, nullable: true }) first?: number,
    @Args("after", { type: () => GraphQLCursor, nullable: true })
    after?: string,
  ): Promise<TransactionConnection> {
    return this.transactionsService.findTransactions(
      user.userId,
      filter,
      orderBy,
      first,
      after,
    );
  }

  @Mutation(() => Transaction)
  async hideTransaction(
    @CurrentUser() user: AuthUser,
    @Args("input") input: HideTransactionInput,
  ): Promise<Transaction> {
    return this.transactionsService.hideTransaction(user.userId, input);
  }

  @Mutation(() => Transaction)
  async updateTransactionCategory(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateTransactionCategoryInput,
  ): Promise<Transaction> {
    return this.transactionsService.updateTransactionCategory(
      user.userId,
      input,
    );
  }
}
