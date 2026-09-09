import { ObjectType, Field, ID } from "@nestjs/graphql";
import { FamilyRole } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { Family } from "./family.entity";
import { User } from "@auth/entities/user.entity";

@ObjectType({ implements: () => [Node] })
export class FamilyMembership implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field(() => User)
  user: User;

  @Field(() => FamilyRole)
  role: FamilyRole;

  @Field()
  joinedAt: Date;
}
