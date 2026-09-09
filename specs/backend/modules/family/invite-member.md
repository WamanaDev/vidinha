# Módulo `family` — Mutation `inviteMember`

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §3.4` (DTO) e `§3.6` (service). Ver [`family.module.md`](./family.module.md) para a visão geral do módulo e [`../../00-overview.md`](../../00-overview.md) para o índice completo.

---

## 1. Contrato GraphQL

```graphql
input InviteMemberInput {
  familyId: ID!
  email: String!
}

type FamilyInvite implements Node {
  id: ID!
  family: Family!
  email: String!
  invitedBy: User!
  status: InviteStatus!
  expiresAt: DateTime!
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

type FamilyInvitePayload {
  invite: FamilyInvite!
}

input AcceptInviteInput {
  inviteToken: String!
}

type Mutation {
  inviteMember(input: InviteMemberInput!): FamilyInvitePayload!
  acceptInvite(input: AcceptInviteInput!): FamilyPayload!
}
```

## 2. Regras de negócio

- Só **ADMIN** pode convidar (checado via CASL — `@CheckAbility({ action: Action.Manage, subject: 'FamilyMember' })`).
- Um e-mail que já pertence a um membro ativo da família não pode receber novo convite — retorna `CONFLICT`.
- O token de convite é armazenado **hasheado** (SHA-256) no banco; o token bruto (`rawToken`) é o único enviado por e-mail ao convidado, nunca persistido em texto puro (`04-SECURITY-COMPLIANCE.md`).
- Prazo de expiração do convite: **7 dias** (`INVITE_EXPIRATION_DAYS` — suposição registrada em [`../../00-overview.md`](../../00-overview.md), não definida explicitamente em `00-DECISIONS.md`).
- Rate limiting dedicado (`invite`, 10/min) para evitar spam de convites — ver [`../../common/rate-limiting.md`](../../common/rate-limiting.md).

## 3. `dto/invite-family-member.input.ts`

Nome de arquivo/classe interno; o `@InputType` é registrado com o nome `InviteMemberInput` do SDL (fonte da verdade), evitando duas nomenclaturas de API divergentes.

```typescript
// apps/api/src/modules/family/dto/invite-family-member.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsEmail, MaxLength } from 'class-validator';

@InputType('InviteMemberInput')
export class InviteFamilyMemberInput {
  @Field(() => ID)
  @IsUUID('4', { message: 'familyId inválido' })
  familyId: string;

  @Field()
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string;
}
```

## 4. `family.service.ts` — `inviteMember`

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)
import { randomBytes, createHash } from 'node:crypto';

const INVITE_EXPIRATION_DAYS = 7; // suposição — ver ../../00-overview.md

/** Convida um membro por e-mail. Só ADMIN pode convidar (checado via CASL no resolver). */
async inviteMember(userId: string, input: InviteFamilyMemberInput) {
  await this.assertActiveMember(input.familyId, userId);

  const existingMember = await this.prisma.familyMember.findFirst({
    where: { familyId: input.familyId, removedAt: null, user: { email: input.email } },
  });
  if (existingMember) {
    throw new ConflictAppException('Este e-mail já pertence a um membro da família.');
  }

  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(rawToken).digest('hex'); // K4 de 04-SECURITY-COMPLIANCE.md

  const invite = await this.prisma.familyInvite.create({
    data: {
      familyId: input.familyId,
      invitedById: userId,
      email: input.email,
      token: hashedToken,
      expiresAt: new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000),
    },
    include: { family: true, invitedBy: true },
  });

  await this.auditLog.record({
    actorId: userId,
    familyId: input.familyId,
    action: AuditAction.FAMILY_INVITE_CREATED,
    metadata: { email: input.email },
  });

  // rawToken (não o hash) é o que vai no e-mail enviado ao convidado — fora do escopo deste service.
  return { invite, rawToken };
}
```

`assertActiveMember` é o helper privado compartilhado por todas as mutations do módulo — lança `NotFoundAppException` (não `ForbiddenAppException`) quando o usuário que age não é membro ativo da família, para não revelar a existência da família a não-membros (ver [`remove-member.md §5`](./remove-member.md)).

## 5. `family.resolver.ts` — `inviteMember`

```typescript
// apps/api/src/modules/family/family.resolver.ts (trecho)

@CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
@Mutation(() => FamilyInvitePayload)
async inviteMember(
  @CurrentUser() user: AuthUser,
  @Args('input') input: InviteFamilyMemberInput,
): Promise<FamilyInvitePayload> {
  const { invite } = await this.familyService.inviteMember(user.userId, input);
  return { invite: invite as any }; // mapeamento completo omitido por brevidade — segue padrão de mapeamento explícito (family.module.md §5)
}
```

## 6. Auditoria

Evento `FAMILY_INVITE_CREATED` é auditado com `metadata: { email }` — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).

## Nota de implementação

O envio do e-mail de convite (com o `rawToken`) e o fluxo de `acceptInvite` (validação do token, criação do `FamilyMember`, marcação do convite como `ACCEPTED`) não têm código de exemplo nas specs originais — implementar seguindo o mesmo padrão de service/resolver/DTO demonstrado neste módulo (`family`), incluindo tratamento de convite expirado (`status = EXPIRED`, retornar `NOT_FOUND` ou `CONFLICT` conforme o caso) e idempotência (convite já aceito não deve recriar o membership).
