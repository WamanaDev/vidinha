import { Field, ObjectType } from "@nestjs/graphql";

/** PageInfo estilo Relay — ver specs/backend/00-overview.md §4. */
@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}
