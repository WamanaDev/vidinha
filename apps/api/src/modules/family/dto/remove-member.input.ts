import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID } from "class-validator";

@InputType("RemoveMemberInput")
export class RemoveMemberInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field(() => ID)
  @IsUUID("4")
  membershipId: string;
}
