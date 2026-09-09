import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";

@ObjectType({ implements: () => [Node] })
export class User implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field()
  mfaEnabled: boolean;

  @Field()
  createdAt: Date;
}
