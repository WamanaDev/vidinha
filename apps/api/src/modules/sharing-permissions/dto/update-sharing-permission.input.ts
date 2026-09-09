import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsOptional, IsBoolean } from "class-validator";

@InputType("UpdateSharingPermissionInput")
export class UpdateSharingPermissionInput {
  @Field(() => ID)
  @IsUUID("4")
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  sharedWithFamily?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  fullDetailShared?: boolean;
}
