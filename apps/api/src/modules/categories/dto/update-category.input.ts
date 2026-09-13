import { InputType, Field, ID } from "@nestjs/graphql";
import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from "class-validator";

@InputType("UpdateCategoryInput")
export class UpdateCategoryInput {
  @Field(() => ID)
  @IsUUID("4")
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hiddenFromFamily?: boolean;
}
