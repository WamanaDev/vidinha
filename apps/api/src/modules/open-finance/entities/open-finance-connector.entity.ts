import { ObjectType, Field, Int } from "@nestjs/graphql";

/**
 * Representa um `Connector` do Pluggy (instituição financeira disponível para
 * conexão direta via API). Espelha o contrato REST confirmado via MCP oficial
 * do Pluggy (ver descrição da tarefa) — não é um model Prisma, é sempre
 * buscado ao vivo em `GET /connectors` (não persistimos o catálogo).
 */
@ObjectType()
export class ConnectorCredentialOption {
  @Field()
  value!: string;

  @Field()
  label!: string;
}

@ObjectType()
export class ConnectorCredential {
  /** Nome técnico do campo — usado como chave em `CredentialParameterInput.name`. */
  @Field()
  name!: string;

  @Field()
  label!: string;

  /**
   * SUPOSIÇÃO: expomos `type` como `String` (não `enum`) — o Pluggy documenta
   * os valores possíveis (text|password|number|image|select) mas não garante
   * que a lista seja fechada/estável; um enum GraphQL quebraria em runtime se
   * o provedor adicionar um novo tipo de campo. O app deve tratar valores
   * desconhecidos com um fallback de texto simples.
   */
  @Field()
  type!: string;

  @Field({ nullable: true })
  placeholder?: string;

  @Field({ nullable: true })
  validation?: string;

  @Field({ nullable: true })
  validationMessage?: string;

  @Field()
  optional!: boolean;

  @Field({ nullable: true })
  instructions?: string;

  @Field(() => [ConnectorCredentialOption], { nullable: true })
  options?: ConnectorCredentialOption[];
}

@ObjectType()
export class ConnectorHealth {
  /** ONLINE | OFFLINE | UNSTABLE (ver mesma SUPOSIÇÃO de `ConnectorCredential.type` sobre não fechar em enum). */
  @Field()
  status!: string;
}

@ObjectType()
export class OpenFinanceConnector {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  primaryColor?: string;

  @Field()
  type!: string;

  @Field()
  country!: string;

  @Field(() => [ConnectorCredential])
  credentials!: ConnectorCredential[];

  @Field()
  hasMFA!: boolean;

  @Field()
  oauth!: boolean;

  // TODO: fluxo OAuth (`oauth: true`) não é implementado por este módulo —
  // apenas repassamos `oauthUrl`; o mobile decide como abrir/tratar esse
  // fluxo (provavelmente WebView simples), sem endpoint de callback próprio
  // por enquanto (ver instrução explícita da tarefa).
  @Field({ nullable: true })
  oauthUrl?: string;

  @Field(() => ConnectorHealth, { nullable: true })
  health?: ConnectorHealth;

  @Field()
  isOpenFinance!: boolean;

  @Field()
  isSandbox!: boolean;
}

@ObjectType()
export class OpenFinanceUserAction {
  /** Ex.: "qr" | "authorize-access" — fluxo de device authorization. */
  @Field()
  type!: string;

  @Field()
  instructions!: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}
