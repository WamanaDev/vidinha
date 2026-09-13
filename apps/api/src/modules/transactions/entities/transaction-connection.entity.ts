import { ObjectType, Field, Int } from "@nestjs/graphql";
import { PageInfo } from "@common/types/page-info.type";
import { TransactionEdge } from "./transaction-edge.entity";

@ObjectType()
export class TransactionConnection {
  @Field(() => [TransactionEdge])
  edges: TransactionEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
