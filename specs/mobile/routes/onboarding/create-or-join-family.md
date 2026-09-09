# Criar ou entrar em família

Grupo `(onboarding)` — autenticado, sem família ativa. `apps/mobile/app/(onboarding)/_layout.tsx` funciona como guard: exige sessão; redireciona para `(app)` se o usuário já tem família.

## Boas-vindas

**Rota:** `/(onboarding)/welcome`

**Query/Mutation GraphQL:** `myFamilies` (decide se deve pular onboarding).

**Estados:** loading, empty (nenhuma família → mostra opções "Criar família" / "Entrar com convite").

## Criar família

**Rota:** `/(onboarding)/create-family`

**Query/Mutation GraphQL:** `createFamily(input: CreateFamilyInput!)`.

**Estados:** loading, error (`BAD_USER_INPUT`).

Ao concluir, segue para [`invite-members.md`](./invite-members.md).

## Entrar em família

**Rota:** `/(onboarding)/join-family`

**Query/Mutation GraphQL:** `acceptInvite(input: AcceptInviteInput!)` (inserir/colar token de convite).

**Estados:** loading, error (`NOT_FOUND`/`CONFLICT` — convite expirado/já aceito).

Ao concluir, vai direto para as tabs (`Tabs`), sem passar por convite de membros.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
