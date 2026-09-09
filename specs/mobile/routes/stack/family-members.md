# Gestão da família

## Gerenciar membros

**Rota:** `/(app)/family-management/members` (`apps/mobile/app/(app)/family-management/members.tsx`)

**Query/Mutation GraphQL:** `family(id).members`.

**Estados:** loading, empty (só o próprio usuário), error.

## Convidar membro

**Rota:** `/(app)/family-management/invite` (`apps/mobile/app/(app)/family-management/invite.tsx`)

**Query/Mutation GraphQL:** `inviteMember(input: InviteMemberInput!)`.

**Estados:** loading, error (`RATE_LIMITED`, `CONFLICT` — já é membro).

## Detalhe do membro (promover/remover)

**Rota:** `/(app)/family-management/member/[membershipId]` (`apps/mobile/app/(app)/family-management/member/[membershipId].tsx`)

**Query/Mutation GraphQL:** `promoteMember(input: PromoteMemberInput!)`, `removeMember(input: RemoveMemberInput!)`.

**Estados:** loading, error (`FORBIDDEN` se não-admin), confirmação destrutiva antes de remover.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
