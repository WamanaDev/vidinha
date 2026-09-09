# Módulo `family` — Mutation `removeMember` (regra do último admin)

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §3.5` (DTO), `§3.6` (service, regra central) e `§3.9` (teste unitário). Ver [`family.module.md`](./family.module.md) para a visão geral do módulo e [`../../00-overview.md`](../../00-overview.md) para o índice completo.

---

## 1. Contrato GraphQL

```graphql
input RemoveMemberInput {
  familyId: ID!
  membershipId: ID!
}

type FamilyPayload {
  family: Family!
}

type Mutation {
  removeMember(input: RemoveMemberInput!): FamilyPayload!
}
```

## 2. Regra de negócio central — nunca remover o último ADMIN

**Não é permitido remover o último ADMIN ativo da família** (suposição registrada em [`../../00-overview.md`](../../00-overview.md) — uma família nunca pode ficar sem administrador). Só **ADMIN** pode remover membros (checado via CASL — `Action.Manage` sobre `FamilyMember`); essa checagem de "único admin" fica no **service**, não no CASL, porque depende de contagem agregada (não é expressável apenas como atributo estático da instância, ver [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md), Regra 2).

Remoção é **soft-delete** (`removedAt`), preservando o histórico de auditoria e o vínculo histórico com transações já compartilhadas.

## 3. `dto/remove-member.input.ts`

```typescript
// apps/api/src/modules/family/dto/remove-member.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType('RemoveMemberInput')
export class RemoveMemberInput {
  @Field(() => ID)
  @IsUUID('4')
  familyId: string;

  @Field(() => ID)
  @IsUUID('4')
  membershipId: string;
}
```

## 4. `family.service.ts` — `removeMember`

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)

/**
 * Remove um membro da família.
 * Regra de negócio central: NÃO é permitido remover o último ADMIN ativo da família
 * (uma família nunca pode ficar sem administrador).
 */
async removeMember(actingUserId: string, input: RemoveMemberInput): Promise<Family> {
  await this.assertActiveMember(input.familyId, actingUserId);

  const membership = await this.prisma.familyMember.findUnique({
    where: { id: input.membershipId },
  });
  if (!membership || membership.familyId !== input.familyId || membership.removedAt) {
    throw new NotFoundAppException('Membro não encontrado nesta família.');
  }

  if (membership.role === FamilyRole.ADMIN) {
    const activeAdminCount = await this.prisma.familyMember.count({
      where: { familyId: input.familyId, role: FamilyRole.ADMIN, removedAt: null },
    });
    if (activeAdminCount <= 1) {
      throw new ForbiddenAppException(
        'Não é possível remover o único administrador da família. Promova outro membro antes.',
      );
    }
  }

  await this.prisma.familyMember.update({
    where: { id: input.membershipId },
    data: { removedAt: new Date() },
  });

  await this.auditLog.record({
    actorId: actingUserId,
    familyId: input.familyId,
    action: AuditAction.FAMILY_MEMBER_REMOVED,
    metadata: { removedUserId: membership.userId, previousRole: membership.role },
  });

  return this.findFamilyOrThrow(input.familyId, actingUserId);
}
```

## 5. Helpers privados compartilhados pelo módulo

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)

private async assertActiveMember(familyId: string, userId: string) {
  const membership = await this.prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
  });
  if (!membership || membership.removedAt) {
    // NOT_FOUND, não FORBIDDEN — não revelar existência da família a não-membros
    // (ver ../../common/exception-filter.md §2)
    throw new NotFoundAppException('Família não encontrada.');
  }
  return membership;
}

private async findFamilyOrThrow(familyId: string, currentUserId: string): Promise<Family> {
  const family = await this.prisma.family.findUnique({
    where: { id: familyId },
    include: { members: { where: { removedAt: null }, include: { user: true } } },
  });
  if (!family) throw new NotFoundAppException('Família não encontrada.');
  return this.toFamilyEntity(family, currentUserId);
}
```

## 6. `family.resolver.ts` — `removeMember`

```typescript
// apps/api/src/modules/family/family.resolver.ts (trecho)

@CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
@Mutation(() => FamilyPayload)
async removeMember(
  @CurrentUser() user: AuthUser,
  @Args('input') input: RemoveMemberInput,
): Promise<FamilyPayload> {
  const family = await this.familyService.removeMember(user.userId, input);
  return { family };
}
```

## 7. Teste unitário — `family.service.spec.ts`

```typescript
// apps/api/src/modules/family/family.service.spec.ts
import { Test } from '@nestjs/testing';
import { FamilyService } from './family.service';
import { PrismaService } from '@prisma-module/prisma.service';
import { AuditLogService } from '@modules/audit-log/audit-log.service';
import { ForbiddenAppException, NotFoundAppException } from '@common/errors/app.exceptions';
import { FamilyRole } from '@prisma/client';

describe('FamilyService — regra do último admin', () => {
  let service: FamilyService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    family: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditLog: { record: jest.Mock };

  const familyId = 'family-1';
  const actingAdminId = 'user-admin';

  beforeEach(async () => {
    prisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      family: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = moduleRef.get(FamilyService);
  });

  it('impede remover o último ADMIN ativo da família', async () => {
    // assertActiveMember: quem age é membro ativo
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({ userId: actingAdminId, familyId, removedAt: null, role: FamilyRole.ADMIN }) // assertActiveMember
      .mockResolvedValueOnce({
        id: 'membership-target',
        familyId,
        userId: actingAdminId,
        role: FamilyRole.ADMIN,
        removedAt: null,
      }); // membership a ser removido (é o próprio único admin)

    prisma.familyMember.count.mockResolvedValue(1); // só há 1 admin ativo

    await expect(
      service.removeMember(actingAdminId, { familyId, membershipId: 'membership-target' }),
    ).rejects.toBeInstanceOf(ForbiddenAppException);

    expect(prisma.familyMember.update).not.toHaveBeenCalled();
  });

  it('permite remover um ADMIN quando há outro ADMIN ativo na família', async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({ userId: actingAdminId, familyId, removedAt: null, role: FamilyRole.ADMIN })
      .mockResolvedValueOnce({
        id: 'membership-target',
        familyId,
        userId: 'other-admin',
        role: FamilyRole.ADMIN,
        removedAt: null,
      });

    prisma.familyMember.count.mockResolvedValue(2); // 2 admins ativos
    prisma.familyMember.update.mockResolvedValue({});
    prisma.family.findUnique.mockResolvedValue({
      id: familyId,
      name: 'Família Teste',
      createdAt: new Date(),
      members: [{ id: 'm1', userId: actingAdminId, role: FamilyRole.ADMIN, joinedAt: new Date(), user: {} }],
    });

    await expect(
      service.removeMember(actingAdminId, { familyId, membershipId: 'membership-target' }),
    ).resolves.toBeDefined();

    expect(prisma.familyMember.update).toHaveBeenCalledWith({
      where: { id: 'membership-target' },
      data: { removedAt: expect.any(Date) },
    });
    expect(auditLog.record).toHaveBeenCalled();
  });

  it('permite remover um MEMBER comum sem checar contagem de admins', async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({ userId: actingAdminId, familyId, removedAt: null, role: FamilyRole.ADMIN })
      .mockResolvedValueOnce({
        id: 'membership-target',
        familyId,
        userId: 'some-member',
        role: FamilyRole.MEMBER,
        removedAt: null,
      });

    prisma.familyMember.update.mockResolvedValue({});
    prisma.family.findUnique.mockResolvedValue({
      id: familyId,
      name: 'Família Teste',
      createdAt: new Date(),
      members: [{ id: 'm1', userId: actingAdminId, role: FamilyRole.ADMIN, joinedAt: new Date(), user: {} }],
    });

    await service.removeMember(actingAdminId, { familyId, membershipId: 'membership-target' });

    expect(prisma.familyMember.count).not.toHaveBeenCalled();
    expect(prisma.familyMember.update).toHaveBeenCalled();
  });

  it('lança NOT_FOUND se o membro-alvo não pertence à família informada', async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({ userId: actingAdminId, familyId, removedAt: null, role: FamilyRole.ADMIN })
      .mockResolvedValueOnce({ id: 'x', familyId: 'other-family', userId: 'u', role: FamilyRole.MEMBER, removedAt: null });

    await expect(
      service.removeMember(actingAdminId, { familyId, membershipId: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundAppException);
  });
});
```

## 8. Auditoria

Evento `FAMILY_MEMBER_REMOVED` é auditado com `metadata: { removedUserId, previousRole }` — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).
