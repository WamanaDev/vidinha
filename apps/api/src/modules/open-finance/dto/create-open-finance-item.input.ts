import { InputType, Field, ID, Int } from "@nestjs/graphql";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsString,
  IsNotEmpty,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CredentialParameterInput } from "./credential-parameter.input";

@InputType()
export class CreateOpenFinanceItemInput {
  /** Família à qual a conexão resultante será associada (checagem de membro ativo no service). */
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  familyId!: string;

  /** `Connector.id` retornado por `openFinanceConnectors`. */
  @Field(() => Int)
  @IsInt()
  connectorId!: number;

  /**
   * Credenciais coletadas pelo formulário nativo, uma por
   * `ConnectorCredential.name` retornado pela query `openFinanceConnectors`.
   * Nunca vazio — rejeitamos criação de item sem nenhuma credencial.
   */
  @Field(() => [CredentialParameterInput])
  @ValidateNested({ each: true })
  @Type(() => CredentialParameterInput)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  parameters!: CredentialParameterInput[];
}
