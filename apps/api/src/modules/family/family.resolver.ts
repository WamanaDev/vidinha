import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { CheckAbility } from "@common/decorators/check-ability.decorator";
import {
  ThrottleInvite,
  ThrottleMutationWrite,
} from "@common/decorators/throttle-named.decorator";
import { PoliciesGuard } from "@common/guards/policies.guard";
import { Action } from "@casl/action.enum";
import { AuthUser } from "@common/types/auth-user.type";
import { FamilyService } from "./family.service";
import { CreateFamilyInput } from "./dto/create-family.input";
import { InviteFamilyMemberInput } from "./dto/invite-family-member.input";
import { AcceptInviteInput } from "./dto/accept-invite.input";
import { RemoveMemberInput } from "./dto/remove-member.input";
import { PromoteMemberInput } from "./dto/promote-member.input";
import { Family } from "./entities/family.entity";
import { FamilyMembership } from "./entities/family-membership.entity";
import {
  FamilyPayload,
  FamilyInvitePayload,
} from "./entities/family-payload.entity";

@Resolver(() => FamilyMembership)
@UseGuards(PoliciesGuard) // JwtAuthGuard já é global (ver app.module.ts); este guard só resolve CASL
export class FamilyResolver {
  constructor(private readonly familyService: FamilyService) {}

  @Query(() => Family)
  async family(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Family> {
    return this.familyService.findFamily(user.userId, id);
  }

  @Query(() => [FamilyMembership])
  async myFamilies(@CurrentUser() user: AuthUser): Promise<FamilyMembership[]> {
    return this.familyService.findMyFamilies(user.userId);
  }

  @Mutation(() => FamilyPayload)
  async createFamily(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateFamilyInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.createFamily(user.userId, input);
    return { family };
  }

  @ThrottleInvite()
  @CheckAbility({
    action: Action.Manage,
    subject: "FamilyMember",
    resolveFamilyId: (a) => a.input.familyId,
  })
  @Mutation(() => FamilyInvitePayload)
  async inviteMember(
    @CurrentUser() user: AuthUser,
    @Args("input") input: InviteFamilyMemberInput,
  ): Promise<FamilyInvitePayload> {
    const { invite } = await this.familyService.inviteMember(
      user.userId,
      input,
    );
    return { invite };
  }

  @ThrottleMutationWrite()
  @Mutation(() => FamilyPayload)
  async acceptInvite(
    @CurrentUser() user: AuthUser,
    @Args("input") input: AcceptInviteInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.acceptInvite(user.userId, input);
    return { family };
  }

  @CheckAbility({
    action: Action.Manage,
    subject: "FamilyMember",
    resolveFamilyId: (a) => a.input.familyId,
  })
  @Mutation(() => FamilyPayload)
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Args("input") input: RemoveMemberInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.removeMember(user.userId, input);
    return { family };
  }

  @CheckAbility({
    action: Action.Manage,
    subject: "FamilyMember",
    resolveFamilyId: (a) => a.input.familyId,
  })
  @Mutation(() => FamilyPayload)
  async promoteMember(
    @CurrentUser() user: AuthUser,
    @Args("input") input: PromoteMemberInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.promoteMember(user.userId, input);
    return { family };
  }

  @ThrottleMutationWrite()
  @Mutation(() => Boolean)
  async leaveFamily(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<boolean> {
    return this.familyService.leaveFamily(user.userId, familyId);
  }

  @CheckAbility({
    action: Action.Delete,
    subject: "Family",
    resolveFamilyId: (a) => a.familyId,
  })
  @Mutation(() => Boolean)
  async deleteFamily(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<boolean> {
    return this.familyService.deleteFamily(user.userId, familyId);
  }
}
