import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { ThrottleMutationWrite } from "@common/decorators/throttle-named.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { CardsService } from "./cards.service";
import { UpdateCardSharingInput } from "./dto/update-card-sharing.input";
import { CreateCardInput } from "./dto/create-card.input";
import { UpdateCardInput } from "./dto/update-card.input";
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

  @ThrottleMutationWrite()
  @Mutation(() => Card)
  async createCard(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateCardInput,
  ): Promise<Card> {
    return this.cardsService.create(user.userId, input);
  }

  @ThrottleMutationWrite()
  @Mutation(() => Card)
  async updateCard(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateCardInput,
  ): Promise<Card> {
    return this.cardsService.updateManual(user.userId, input);
  }

  @ThrottleMutationWrite()
  @Mutation(() => Boolean)
  async archiveCard(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.cardsService.archive(user.userId, id);
  }
}
