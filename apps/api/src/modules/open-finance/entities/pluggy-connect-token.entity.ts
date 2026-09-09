import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class PluggyConnectToken {
  @Field()
  connectToken!: string;

  @Field()
  expiresAt!: Date;
}
