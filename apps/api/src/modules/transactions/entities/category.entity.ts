import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Node } from "@common/types/node.interface";

/**
 * Type de LEITURA para `Category` (dono deste type é o módulo `transactions`,
 * já que `Transaction.category` o referencia — ver transactions.module.md
 * introdução). CRUD de categoria (`createCategory`/`updateCategory`/
 * `deleteCategory`) pertence ao módulo `categories`, reutilizando esta MESMA
 * classe de entity (ver categories.service.ts) para evitar dois
 * `@ObjectType('Category')` conflitantes no schema.
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
 * `transactions.service.ts#resolveCategoryVisibility` (leitura) e
 * `categories.service.ts#updateCategory` (escrita, via
 * `SharingPermissionsService#upsertForResource`).
 *
 * `isDefault`: campo adicionado além do SDL rascunhado em
 * categories.module.md (sugestão da própria spec, §2, "suposição a validar
 * com produto") para o client distinguir o catálogo global (seed,
 * `ownerId: null`) de categorias customizadas por família. SUPOSIÇÃO:
 * `isDefault = ownerId === null`. Ver cálculo em
 * `categories.service.ts#toEntity`.
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

  @Field()
  isDefault: boolean;
}
