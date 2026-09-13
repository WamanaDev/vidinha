import { InputType, Field, registerEnumType } from "@nestjs/graphql";
import { IsEnum } from "class-validator";
import { OrderDirection } from "@common/types/order-direction.enum";

export enum TransactionOrderField {
  DATE = "DATE",
  AMOUNT = "AMOUNT",
}

registerEnumType(TransactionOrderField, { name: "TransactionOrderField" });

@InputType("TransactionOrderInput")
export class TransactionOrderInput {
  @Field(() => TransactionOrderField)
  @IsEnum(TransactionOrderField)
  field: TransactionOrderField;

  @Field(() => OrderDirection)
  @IsEnum(OrderDirection)
  direction: OrderDirection;
}
