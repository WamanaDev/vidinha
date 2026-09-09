import { ObjectType, Field } from "@nestjs/graphql";
import { Family } from "./family.entity";
import { FamilyInvite } from "./family-invite.entity";

@ObjectType()
export class FamilyPayload {
  @Field(() => Family)
  family: Family;
}

@ObjectType()
export class FamilyInvitePayload {
  @Field(() => FamilyInvite)
  invite: FamilyInvite;
}
