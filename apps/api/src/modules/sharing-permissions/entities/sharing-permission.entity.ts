import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { SharableResourceType } from "@prisma/client";
import { Node } from "@common/types/node.interface";
import { User } from "@auth/entities/user.entity";
import { Family } from "@modules/family/entities/family.entity";

// SUPOSIÇÃO: o contrato SDL do módulo (specs/backend/modules/sharing-permissions/
// sharing-permissions.module.md) usa o nome `SharingScope` para o enum GraphQL,
// mas o schema Prisma real (specs/data-model/schema.prisma) define o enum como
// `SharableResourceType` no campo `resourceType`. Os valores (ACCOUNT/CARD/
// CATEGORY) são idênticos — só o nome do tipo muda. Aqui expomos o enum Prisma
// já registrado sob o nome GraphQL `SharingScope`, exigido pelo contrato.
export { SharableResourceType as SharingScope };
registerEnumType(SharableResourceType, {
  name: "SharingScope",
});

/**
 * Mapeia o model Prisma `SharingPermission` para o ObjectType GraphQL do
 * contrato do módulo. Nomes de campo divergem entre Prisma e GraphQL:
 * - `resourceType` (Prisma) -> `scope` (GraphQL)
 * - `resourceId` (Prisma) -> `targetId` (GraphQL)
 * - `allowFullDetail` (Prisma) -> `fullDetailShared` (GraphQL)
 * - `revokedAt === null` (Prisma) -> `sharedWithFamily: true` (GraphQL, campo
 *   derivado, não existe como coluna própria — ver SUPOSIÇÃO em
 *   sharing-permissions.service.ts).
 */
@ObjectType({ implements: () => [Node] })
export class SharingPermission implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field(() => User)
  owner: User;

  @Field(() => SharableResourceType)
  scope: SharableResourceType;

  @Field(() => ID)
  targetId: string;

  @Field()
  sharedWithFamily: boolean;

  @Field()
  fullDetailShared: boolean;

  @Field()
  updatedAt: Date;
}
