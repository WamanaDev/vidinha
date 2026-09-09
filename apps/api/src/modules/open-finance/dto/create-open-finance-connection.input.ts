import { InputType, Field } from "@nestjs/graphql";
import { IsString, IsNotEmpty } from "class-validator";

@InputType()
export class CreateOpenFinanceConnectionInput {
  /** Gerado pelo Pluggy Connect no client após o usuário concluir o fluxo. */
  @Field()
  @IsString()
  @IsNotEmpty()
  itemId!: string;
}
