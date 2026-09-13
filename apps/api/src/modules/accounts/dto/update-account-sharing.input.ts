import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsBoolean } from "class-validator";

@InputType("UpdateAccountSharingInput")
export class UpdateAccountSharingInput {
  @Field(() => ID)
  @IsUUID("4")
  accountId: string;

  @Field()
  @IsBoolean()
  sharedWithFamily: boolean;

  @Field()
  @IsBoolean()
  fullDetailShared: boolean;
}
