import { InputType, Field } from "@nestjs/graphql";
import { IsString, Length, Matches } from "class-validator";
import { Transform } from "class-transformer";

@InputType()
export class CreateFamilyInput {
  @Field()
  @IsString()
  @Length(2, 60, {
    message: "Nome da família deve ter entre 2 e 60 caracteres",
  })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[\p{L}\p{N}\s\-'.]+$/u, {
    message: "Nome da família contém caracteres inválidos",
  })
  name: string;
}
