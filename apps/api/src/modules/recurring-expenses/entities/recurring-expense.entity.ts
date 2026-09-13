import {
  ObjectType,
  Field,
  ID,
  Float,
  registerEnumType,
} from "@nestjs/graphql";
import { RecurrenceFrequency as PrismaRecurrenceFrequency } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";
import { Family } from "@modules/family/entities/family.entity";
import { Category } from "@modules/transactions/entities/category.entity";

// SUPOSIÇÃO/divergência documentada: o SDL rascunhado em
// recurring-expenses.module.md §1 define `RecurrenceFrequency` com apenas
// MONTHLY/WEEKLY/YEARLY, mas o schema Prisma real (fonte de verdade,
// specs/data-model/schema.prisma) tem 6 valores: WEEKLY/MONTHLY/BIMONTHLY/
// QUARTERLY/SEMIANNUAL/ANNUAL. Seguimos o Prisma, conforme instrução do
// agente ("nomes de enums são exatos, não invente nomes alternativos").
export { PrismaRecurrenceFrequency as RecurrenceFrequency };
registerEnumType(PrismaRecurrenceFrequency, { name: "RecurrenceFrequency" });

/**
 * Mapeia o model Prisma `RecurringExpense` para o ObjectType GraphQL do
 * contrato (recurring-expenses.module.md §1), com as seguintes divergências
 * documentadas (ver instruções da tarefa / comentários no service):
 *
 * - `description` (SDL) <- `name` (Prisma): mapeamento explícito de nome.
 * - `owner` (SDL) <- `createdBy` (Prisma): mapeamento explícito de nome.
 * - `nextDueDate`: NÃO é uma coluna Prisma — calculada em runtime a partir de
 *   `dueDay`+`frequency`+`startDate`(+`endDate`) — ver
 *   `recurring-expenses.service.ts#computeNextDueDate`.
 * - `sharedWithFamily`: SUPOSIÇÃO — sempre `true`. O model Prisma não tem
 *   conceito de "dono privado" para despesas recorrentes (a despesa já
 *   pertence à família inteira via `familyId`, diferente de `Account`/
 *   `Card`). Simplificação até o produto decidir se despesas recorrentes
 *   precisam de visibilidade privada por membro (exigiria nova coluna,
 *   fora do escopo desta tarefa).
 */
@ObjectType({ implements: () => [Node] })
export class RecurringExpense implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field()
  description: string;

  @Field(() => Float)
  amount: number;

  @Field(() => PrismaRecurrenceFrequency)
  frequency: PrismaRecurrenceFrequency;

  @Field()
  nextDueDate: Date;

  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field()
  sharedWithFamily: boolean;

  @Field(() => User)
  owner: User;
}
