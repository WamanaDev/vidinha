import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID } from "class-validator";

@InputType("PromoteMemberInput")
export class PromoteMemberInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field(() => ID)
  @IsUUID("4")
  membershipId: string;
}
