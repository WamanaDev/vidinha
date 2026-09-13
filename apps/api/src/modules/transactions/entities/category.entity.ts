import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";

/**
 * Type de LEITURA para `Category` (dono deste type é o módulo `transactions`,
 * já que `Transaction.category` o referencia — ver transactions.module.md
 * introdução). CRUD de categoria (`createCategory`/`updateCategory`/
 * `deleteCategory`) pertence ao módulo `categories`, não implementado aqui.
 *
 * `hiddenFromFamily` NÃO é uma coluna do model Prisma `Category` — o SDL do
 * contrato pede esse campo, mas o schema real (specs/data-model/schema.prisma)
 * não o define. SUPOSIÇÃO: categorias usam o MESMO mecanismo de
 * `SharingPermission` (scope `CATEGORY`) já usado por `Account`/`Card`, com a
 * lógica invertida — "oculta da família" é o oposto de "compartilhada com a
 * família": `hiddenFromFamily = NÃO existe SharingPermission ativa para essa
 * categoria`. Categorias padrão do sistema (`ownerId: null`, sem dono capaz
 * de compartilhar/ocultar) são tratadas como sempre visíveis
 * (`hiddenFromFamily: false`). Ver cálculo em
 * `transactions.service.ts#resolveCategoryVisibility`.
 */
@ObjectType({ implements: () => [Node] })
export class Category implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  icon?: string;

  @Field()
  hiddenFromFamily: boolean;
}
