import { ObjectType, Field, ID } from "@nestjs/graphql";
import { TransactionType as PrismaTransactionType } from "@prisma/client";
import { registerEnumType } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";
import { Account } from "@modules/accounts/entities/account.entity";
import { Card } from "@modules/cards/entities/card.entity";
import { Category } from "./category.entity";

// Exposto apenas para eventual uso futuro por filtros/queries de relatório;
// não faz parte do SDL do contrato deste módulo, mas registrar o enum não
// tem custo e evita duplicar o registro caso outro módulo precise dele.
export { PrismaTransactionType as TransactionType };
registerEnumType(PrismaTransactionType, { name: "TransactionType" });

/**
 * Mapeia o model Prisma `Transaction` para o ObjectType GraphQL do contrato
 * (transactions.module.md §1). Duas divergências reais entre a spec e o
 * schema Prisma:
 *
 * 1. SDL pede `Transaction.date`, Prisma tem `occurredAt` — mapeamento
 *    explícito em `transactions.service.ts#toEntity` (`date: tx.occurredAt`).
 * 2. SDL declara `account: Account!` (não-nulo), mas o model Prisma permite
 *    `accountId: null` quando a transação pertence a um cartão
 *    (`Transaction.accountId`/`cardId` — exatamente um dos dois é
 *    preenchido, validado na camada de serviço). SUPOSIÇÃO: seguimos o
 *    schema Prisma (fonte de verdade) e tornamos `account` nullable aqui,
 *    já que uma transação lançada em um cartão nunca terá conta associada.
 */
@ObjectType({ implements: () => [Node] })
export class Transaction implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  description: string;

  @Field()
  amount: number;

  @Field()
  date: Date;

  @Field(() => Account, { nullable: true })
  account?: Account;

  @Field(() => Card, { nullable: true })
  card?: Card;

  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field()
  hiddenFromFamily: boolean;

  @Field(() => User)
  owner: User;
}
