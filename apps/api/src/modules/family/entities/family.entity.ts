import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { FamilyRole as PrismaFamilyRole } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { FamilyMembership } from "./family-membership.entity";

export { PrismaFamilyRole as FamilyRole };
registerEnumType(PrismaFamilyRole, { name: "FamilyRole" });

@ObjectType({ implements: () => [Node] })
export class Family implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field(() => [FamilyMembership])
  members: FamilyMembership[];

  @Field(() => PrismaFamilyRole)
  myRole: PrismaFamilyRole;
}
