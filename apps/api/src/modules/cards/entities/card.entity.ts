import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";

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

  @Field({ nullable: true })
  lastFourDigits?: string;

  @Field({ nullable: true })
  limit?: number;

  @Field({ nullable: true })
  currentInvoice?: number;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field()
  sharedWithFamily: boolean;

  @Field(() => User)
  owner: User;
}
