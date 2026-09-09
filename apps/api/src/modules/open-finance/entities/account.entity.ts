import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { AccountType } from "@prisma/client";

registerEnumType(AccountType, { name: "AccountType" });

/**
 * SUPOSIÇÃO: placeholder mínimo de `Account` (GraphQL ObjectType), definido
 * aqui porque o módulo `accounts` ainda não foi implementado (ver ordem de
 * `specs/backend/00-overview.md §3` — open-finance vem antes de accounts).
 * `OpenFinanceConnection.accounts` referencia este tipo temporariamente; ao
 * implementar o módulo `accounts`, esta classe deve ser removida daqui e
 * substituída pela entity definitiva de `modules/accounts/entities/account.entity.ts`
 * (mesmo shape, para não quebrar o schema já publicado).
 */
@ObjectType("Account")
export class AccountEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => AccountType)
  type!: AccountType;

  @Field()
  name!: string;

  @Field({ nullable: true })
  maskedNumber?: string;

  @Field()
  currency!: string;

  @Field()
  balance!: number;
}
