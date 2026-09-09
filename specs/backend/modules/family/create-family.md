# Módulo `family` — Mutation `createFamily`

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §3.3` (DTO) e `§3.6` (service). Ver [`family.module.md`](./family.module.md) para a visão geral do módulo e [`../../00-overview.md`](../../00-overview.md) para o índice completo.

---

## 1. Contrato GraphQL

```graphql
input CreateFamilyInput {
  name: String!
}

type FamilyPayload {
  family: Family!
}

type Mutation {
  createFamily(input: CreateFamilyInput!): FamilyPayload!
}
```

## 2. Regra de negócio

Quem cria a família é automaticamente o primeiro **ADMIN** (`00-DECISIONS.md §1`). Não há checagem de `@CheckAbility()` nesta mutation — qualquer usuário autenticado pode criar uma família (não há papel prévio a verificar, já que a família ainda não existe).

## 3. `dto/create-family.input.ts`

```typescript
// apps/api/src/modules/family/dto/create-family.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class CreateFamilyInput {
  @Field()
  @IsString()
  @Length(2, 60, { message: 'Nome da família deve ter entre 2 e 60 caracteres' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[\p{L}\p{N}\s\-'.]+$/u, {
    message: 'Nome da família contém caracteres inválidos',
  })
  name: string;
}
```

## 4. `family.service.ts` — `createFamily`

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)

/** Cria uma família; quem cria é automaticamente o primeiro ADMIN (00-DECISIONS §1). */
async createFamily(userId: string, input: CreateFamilyInput): Promise<Family> {
  const created = await this.prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        name: input.name,
        members: { create: { userId, role: FamilyRole.ADMIN } },
      },
      include: { members: { include: { user: true } } },
    });
    return family;
  });

  await this.auditLog.record({
    actorId: userId,
    familyId: created.id,
    action: AuditAction.FAMILY_CREATED,
    metadata: { name: created.name },
  });

  return this.toFamilyEntity(created, userId);
}
```

Nota: a criação roda em `$transaction` porque cria simultaneamente a `Family` e o primeiro `FamilyMember` (ADMIN) — atomicidade garante que nunca existirá uma família sem nenhum membro (ver `CLAUDE.md §40`, ACID/Atomicidade).

## 5. `family.resolver.ts` — `createFamily`

```typescript
// apps/api/src/modules/family/family.resolver.ts (trecho)

@Mutation(() => FamilyPayload)
async createFamily(
  @CurrentUser() user: AuthUser,
  @Args('input') input: CreateFamilyInput,
): Promise<FamilyPayload> {
  const family = await this.familyService.createFamily(user.userId, input);
  return { family };
}
```

## 6. Auditoria

Evento `FAMILY_CREATED` é obrigatoriamente auditado (`00-DECISIONS.md §9`, retenção mínima 12 meses), com `metadata: { name }` — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).
