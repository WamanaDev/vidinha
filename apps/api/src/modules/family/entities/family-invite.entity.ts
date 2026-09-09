import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";
import { Family } from "./family.entity";
import { User } from "@auth/entities/user.entity";

export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  DECLINED = "DECLINED",
}
registerEnumType(InviteStatus, { name: "InviteStatus" });

@ObjectType({ implements: () => [Node] })
export class FamilyInvite implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field()
  email: string;

  @Field(() => User)
  invitedBy: User;

  @Field(() => InviteStatus)
  status: InviteStatus;

  @Field()
  expiresAt: Date;
}
