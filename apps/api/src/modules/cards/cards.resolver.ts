import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { CardsService } from "./cards.service";
import { UpdateCardSharingInput } from "./dto/update-card-sharing.input";
import { Card } from "./entities/card.entity";

/**
 * Sem `PoliciesGuard`/`@CheckAbility()` aqui: mesma justificativa de
 * `accounts.resolver.ts` — autorização resolvida dentro do `CardsService`.
 */
@Resolver(() => Card)
export class CardsResolver {
  constructor(private readonly cardsService: CardsService) {}

  @Query(() => [Card])
  async cards(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<Card[]> {
    return this.cardsService.findByFamily(user.userId, familyId);
  }

  @Mutation(() => Card)
  async updateCardSharing(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateCardSharingInput,
  ): Promise<Card> {
    return this.cardsService.updateSharing(user.userId, input);
  }
}
