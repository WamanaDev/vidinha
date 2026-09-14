import { InputType, Field, ID } from "@nestjs/graphql";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CredentialParameterInput } from "./credential-parameter.input";

@InputType()
export class SendOpenFinanceItemMfaInput {
  /** `Item.id` retornado por `createOpenFinanceItem`/`sendOpenFinanceItemMfa` anterior. */
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  /**
   * Normalmente contém um único par (nome do parâmetro de MFA, vindo de
   * `OpenFinanceItemResult.mfaParameter.name` -> valor digitado pelo usuário),
   * mas aceitamos múltiplos para não travar em fluxos de MFA compostos.
   */
  @Field(() => [CredentialParameterInput])
  @ValidateNested({ each: true })
  @Type(() => CredentialParameterInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  parameters!: CredentialParameterInput[];
}
