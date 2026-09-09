# Convidar membros

**Rota:** `/(onboarding)/invite-members`

**Query/Mutation GraphQL:** `inviteMember(input: InviteMemberInput!)`.

**Estados:** loading, error (`RATE_LIMITED` no throttler `invite`).

Exibida logo após a criação da família (ver [`create-or-join-family.md`](./create-or-join-family.md)). Usa `useOnboardingStore` (Zustand, ver [`../../00-overview.md`](../../00-overview.md#32-estado-de-ui-local-zustand-não-context-api-puro)) para manter `inviteEmails` entre passos do wizard. Ao concluir, segue para as tabs (`Tabs`).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
