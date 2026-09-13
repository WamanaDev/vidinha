import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsBoolean } from "class-validator";

@InputType("UpdateCardSharingInput")
export class UpdateCardSharingInput {
  @Field(() => ID)
  @IsUUID("4")
  cardId: string;

  @Field()
  @IsBoolean()
  sharedWithFamily: boolean;
}
