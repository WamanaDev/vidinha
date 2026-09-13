import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { AccountsService } from "./accounts.service";
import { UpdateAccountSharingInput } from "./dto/update-account-sharing.input";
import { Account } from "./entities/account.entity";

/**
 * Sem `PoliciesGuard`/`@CheckAbility()` aqui: a autorização de leitura e a
 * checagem de posse da mutation são resolvidas dentro do
 * `AccountsService` com queries Prisma explícitas — ver justificativa no
 * cabeçalho de `accounts.service.ts`.
 */
@Resolver(() => Account)
export class AccountsResolver {
  constructor(private readonly accountsService: AccountsService) {}

  @Query(() => [Account])
  async accounts(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<Account[]> {
    return this.accountsService.findByFamily(user.userId, familyId);
  }

  @Mutation(() => Account)
  async updateAccountSharing(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateAccountSharingInput,
  ): Promise<Account> {
    return this.accountsService.updateSharing(user.userId, input);
  }
}
