import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID } from "class-validator";

@InputType("UpdateTransactionCategoryInput")
export class UpdateTransactionCategoryInput {
  @Field(() => ID)
  @IsUUID("4")
  transactionId: string;

  @Field(() => ID)
  @IsUUID("4")
  categoryId: string;
}
