import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { CardType as PrismaCardType } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";
import { OpenFinanceConnection } from "@modules/open-finance/entities/open-finance-connection.entity";

// SUPOSIÇÃO: o SDL de exemplo do contrato (cards.module.md §1) não expõe um
// campo `type` em `Card`, mas o cadastro manual de cartão (accounts/cards
// module, tarefa de CRUD manual) precisa que o usuário informe o tipo
// (CREDIT/DEBIT/PREPAID) na criação — adicionamos o campo/enum ao ObjectType,
// seguindo o schema Prisma real (fonte de verdade).
export { PrismaCardType as CardType };
registerEnumType(PrismaCardType, { name: "CardType" });

/**
 * Mapeia o model Prisma `Card` para o ObjectType GraphQL do contrato do
 * módulo (specs/backend/modules/cards/cards.module.md §1).
 *
 * - `limit` (GraphQL) <- `creditLimit` (Prisma) — nomes divergem, mapeamento
 *   explícito feito em `cards.service.ts#toEntity`.
 * - `dueDate`: SUPOSIÇÃO — o model `Card` (specs/data-model/schema.prisma) não
 *   tem um campo de data de vencimento de fatura; o SDL do contrato pede
 *   `dueDate: DateTime`, então retornamos sempre `null` (não alteramos o
 *   schema Prisma, que é a fonte de verdade). Ver `cards.service.ts#toEntity`.
 * - `sharedWithFamily` NÃO é uma coluna do model `Card` — é calculada em
 *   runtime a partir do `SharingPermission` correspondente
 *   (`resourceType: 'CARD'`, `resourceId: card.id`), mesma convenção usada
 *   por `Account` (ver `accounts/entities/account.entity.ts`).
 * - `Card` não expõe `fullDetailShared` próprio (o contrato do módulo já
 *   explica: o detalhe de compras no cartão segue o `fullDetailShared` da
 *   conta de fatura associada, via `Transaction.card`) — não implementado
 *   aqui por não fazer parte do SDL deste módulo.
 */
@ObjectType({ implements: () => [Node] })
export class Card implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => PrismaCardType)
  type: PrismaCardType;

  @Field({ nullable: true })
  brand?: string;

  @Field({ nullable: true })
  lastFourDigits?: string;

  @Field({ nullable: true })
  limit?: number;

  @Field({ nullable: true })
  currentInvoice?: number;

  @Field({ nullable: true })
  dueDate?: Date;

  /**
   * Presente quando o cartão veio de uma sincronização Open Finance;
   * ausente (`undefined`) para cartão manual — mesma convenção de
   * `Account.connection` (ver `accounts/entities/account.entity.ts`). O
   * client deriva "é manual?" como `connection == null`, idêntico ao que já
   * fazia para `Account`.
   */
  @Field(() => OpenFinanceConnection, { nullable: true })
  connection?: OpenFinanceConnection;

  @Field()
  sharedWithFamily: boolean;

  @Field(() => User)
  owner: User;
}
