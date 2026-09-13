import { ObjectType, Field } from "@nestjs/graphql";
import { GraphQLCursor } from "@common/types/cursor.scalar";
import { Transaction } from "./transaction.entity";

@ObjectType()
export class TransactionEdge {
  @Field(() => GraphQLCursor)
  cursor: string;

  @Field(() => Transaction)
  node: Transaction;
}
