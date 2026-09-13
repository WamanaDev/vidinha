import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { AccountType as PrismaAccountType } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";
import { OpenFinanceConnection } from "@modules/open-finance/entities/open-finance-connection.entity";

// SUPOSIÇÃO: o SDL de exemplo do contrato (specs/backend/modules/accounts/
// accounts.module.md §1) lista os valores CHECKING/SAVINGS/CREDIT_CARD_WALLET
// para `AccountType`, mas o schema Prisma real (fonte de verdade, specs/data-model/
// schema.prisma) define o enum como CHECKING/SAVINGS/INVESTMENT/OTHER (sem
// CREDIT_CARD_WALLET — carteiras de cartão de crédito não têm um `AccountType`
// próprio no schema atual). Seguimos o schema Prisma, conforme instrução
// explícita do agente ("nomes de models/enums/campos são exatos, não invente
// nomes alternativos"). Este enum foi anteriormente registrado (com o mesmo
// nome GraphQL "AccountType") pelo placeholder de
// modules/open-finance/entities/account.entity.ts, removido nesta implementação.
export { PrismaAccountType as AccountType };
registerEnumType(PrismaAccountType, { name: "AccountType" });

/**
 * Mapeia o model Prisma `Account` para o ObjectType GraphQL do contrato do
 * módulo (specs/backend/modules/accounts/accounts.module.md §1).
 *
 * `sharedWithFamily`/`fullDetailShared` NÃO são colunas do model `Account` —
 * são calculados em runtime a partir do `SharingPermission` correspondente
 * (`resourceType: 'ACCOUNT'`, `resourceId: account.id`), seguindo a mesma
 * convenção de nomes de campo Prisma usada por
 * `sharing-permissions.service.ts#toEntity`:
 * - `sharedWithFamily = revokedAt === null` (existe permissão ativa)
 * - `fullDetailShared = allowFullDetail`
 * Ver `accounts.service.ts#toEntity` para o mapeamento efetivo.
 */
@ObjectType({ implements: () => [Node] })
export class Account implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => PrismaAccountType)
  type: PrismaAccountType;

  @Field()
  balance: number;

  @Field()
  currency: string;

  @Field(() => OpenFinanceConnection, { nullable: true })
  connection?: OpenFinanceConnection;

  @Field()
  sharedWithFamily: boolean;

  @Field()
  fullDetailShared: boolean;

  @Field(() => User)
  owner: User;
}
