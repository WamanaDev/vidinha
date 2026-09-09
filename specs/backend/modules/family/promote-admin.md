# Módulo `family` — Mutation `promoteMember`

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §3.5` (DTO) e `§3.6` (service). Ver [`family.module.md`](./family.module.md) para a visão geral do módulo e [`../../00-overview.md`](../../00-overview.md) para o índice completo.

---

## 1. Contrato GraphQL

```graphql
input PromoteMemberInput {
  familyId: ID!
  membershipId: ID!
}

type FamilyPayload {
  family: Family!
}

type Mutation {
  promoteMember(input: PromoteMemberInput!): FamilyPayload!
}
```

## 2. Regra de negócio

Promove um **MEMBER** a **ADMIN**. Só ADMIN pode promover (checado via CASL — `Action.Manage` sobre `FamilyMember`, mesma checagem de `removeMember`/`inviteMember`). Diferente de `removeMember`, **não há regra de "último admin"** aqui — promoção só adiciona administradores, nunca reduz a contagem. A operação é idempotente: promover quem já é ADMIN simplesmente retorna a família sem alteração.

## 3. `dto/promote-member.input.ts`

```typescript
// apps/api/src/modules/family/dto/promote-member.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('PromoteMemberInput')
export class PromoteMemberInput {
  @Field(() => ID)
  @IsUUID('4')
  familyId: string;

  @Field(() => ID)
  @IsUUID('4')
  membershipId: string;
}
```

## 4. `family.service.ts` — `promoteMember`

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)

/** Promove um MEMBER a ADMIN. Não há regra de "último admin" aqui (promoção só adiciona admins). */
async promoteMember(actingUserId: string, input: PromoteMemberInput): Promise<Family> {
  await this.assertActiveMember(input.familyId, actingUserId);

  const membership = await this.prisma.familyMember.findUnique({
    where: { id: input.membershipId },
  });
  if (!membership || membership.familyId !== input.familyId || membership.removedAt) {
    throw new NotFoundAppException('Membro não encontrado nesta família.');
  }
  if (membership.role === FamilyRole.ADMIN) {
    return this.findFamilyOrThrow(input.familyId, actingUserId); // já é admin, idempotente
  }

  await this.prisma.familyMember.update({
    where: { id: input.membershipId },
    data: { role: FamilyRole.ADMIN },
  });

  await this.auditLog.record({
    actorId: actingUserId,
    familyId: input.familyId,
    action: AuditAction.FAMILY_MEMBER_ROLE_CHANGED,
    metadata: { targetUserId: membership.userId, previousRole: FamilyRole.MEMBER, newRole: FamilyRole.ADMIN },
  });

  return this.findFamilyOrThrow(input.familyId, actingUserId);
}
```

`assertActiveMember` e `findFamilyOrThrow` são os helpers privados compartilhados pelo módulo — ver [`remove-member.md §5`](./remove-member.md) para as implementações completas.

## 5. `family.resolver.ts` — `promoteMember`

```typescript
// apps/api/src/modules/family/family.resolver.ts (trecho)

@CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
@Mutation(() => FamilyPayload)
async promoteMember(
  @CurrentUser() user: AuthUser,
  @Args('input') input: PromoteMemberInput,
): Promise<FamilyPayload> {
  const family = await this.familyService.promoteMember(user.userId, input);
  return { family };
}
```

## 6. Auditoria

Evento `FAMILY_MEMBER_ROLE_CHANGED` é auditado com `metadata: { targetUserId, previousRole, newRole }` — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md). Este evento cobre o requisito de `00-DECISIONS.md §9` ("mudança de papel de membro" entre os eventos obrigatoriamente auditados).
