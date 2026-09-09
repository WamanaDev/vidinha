import { InputType, Field } from "@nestjs/graphql";
import { IsString, Length } from "class-validator";

@InputType("AcceptInviteInput")
export class AcceptInviteInput {
  @Field()
  @IsString()
  @Length(1, 512)
  inviteToken: string;
}
