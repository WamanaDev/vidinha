import { InputType, Field, ID } from "@nestjs/graphql";
import { IsUUID, IsString, IsNotEmpty, IsOptional } from "class-validator";

@InputType("CreateCategoryInput")
export class CreateCategoryInput {
  @Field(() => ID)
  @IsUUID("4")
  familyId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;
}
