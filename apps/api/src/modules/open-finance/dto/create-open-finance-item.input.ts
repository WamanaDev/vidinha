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
   * Pode ser vazio: alguns conectores reais da Pluggy (ex.: "MeuPluggy",
   * `credentials: []`) não pedem nenhuma credencial de formulário — a
   * conexão é criada e sincronizada diretamente. Rejeitar array vazio aqui
   * bloquearia esses conectores por completo.
   */
  @Field(() => [CredentialParameterInput])
  @ValidateNested({ each: true })
  @Type(() => CredentialParameterInput)
  @ArrayMaxSize(20)
  parameters!: CredentialParameterInput[];
}
