import { ObjectType, Field } from "@nestjs/graphql";
import { OpenFinanceConnection } from "./open-finance-connection.entity";
import {
  ConnectorCredential,
  OpenFinanceUserAction,
} from "./open-finance-connector.entity";

/**
 * Retorno de `createOpenFinanceItem`/`sendOpenFinanceItemMfa`. Sempre inclui a
 * `OpenFinanceConnection` já persistida (mesmo quando o item ainda não
 * terminou de sincronizar) — o app deve olhar `status`/`executionStatus` para
 * decidir se precisa pedir mais um valor de MFA (`mfaParameter` presente) ou
 * aguardar um `userAction` (fluxo OAuth/QR).
 */
@ObjectType()
export class OpenFinanceItemResult {
  @Field(() => OpenFinanceConnection)
  connection!: OpenFinanceConnection;

  /**
   * Id do Item na Pluggy (não o id da nossa `OpenFinanceConnection`). O
   * client precisa guardar isso para chamar `sendOpenFinanceItemMfa` quando
   * `mfaParameter` vier preenchido — `SendOpenFinanceItemMfaInput.itemId`
   * espera exatamente este valor.
   */
  @Field()
  pluggyItemId!: string;

  /** Espelha `Item.status` do Pluggy (ver `ConnectionStatus` para o valor já mapeado em `connection.status`). */
  @Field()
  status!: string;

  /** Espelha `Item.executionStatus` do Pluggy (mais granular que `status`). */
  @Field({ nullable: true })
  executionStatus?: string;

  /** Presente quando o Pluggy está aguardando um valor de MFA — descreve qual credencial pedir agora. */
  @Field(() => ConnectorCredential, { nullable: true })
  mfaParameter?: ConnectorCredential;

  /** Presente em fluxos de device authorization (QR code / autorização no app do banco). */
  @Field(() => OpenFinanceUserAction, { nullable: true })
  userAction?: OpenFinanceUserAction;

  /** Mensagem segura de erro (nunca inclui credenciais/stacktrace), quando `status` indica falha. */
  @Field({ nullable: true })
  errorMessage?: string;
}
