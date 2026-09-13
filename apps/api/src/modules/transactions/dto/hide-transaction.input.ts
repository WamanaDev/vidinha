import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsBoolean } from "class-validator";

@InputType("HideTransactionInput")
export class HideTransactionInput {
  @Field(() => ID)
  @IsUUID("4")
  transactionId: string;

  @Field()
  @IsBoolean()
  hiddenFromFamily: boolean;
}
