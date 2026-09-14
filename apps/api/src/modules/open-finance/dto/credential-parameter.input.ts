import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * Um par nome/valor de credencial exigida pelo Connector do Pluggy
 * (`ConnectorCredential.name` -> valor preenchido pelo usuário no formulário
 * nativo). Usado tanto para as credenciais iniciais (`CreateOpenFinanceItemInput`)
 * quanto para o valor de MFA (`SendOpenFinanceItemMfaInput`).
 *
 * `value` tem um limite de tamanho conservador (500 chars) apenas para evitar
 * que o campo vire vetor de payload gigante — nunca é persistido no Postgres
 * nem logado (ver open-finance.service.ts e pluggy-client.service.ts).
 */
@InputType()
export class CredentialParameterInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value!: string;
}
