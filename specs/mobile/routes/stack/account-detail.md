# Detalhe de conta

**Rota:** `/(app)/account/[id]` (`apps/mobile/app/(app)/account/[id].tsx`)

**Query/Mutation GraphQL:** `accounts(familyId)` (filtra por `id` no client — ver Suposição #1 em [`../../00-overview.md`](../../00-overview.md#suposições-desta-spec)) ou campo dedicado quando disponível; `updateAccountSharing` acionada a partir desta tela (ver [`sharing-settings.md`](./sharing-settings.md)).

**Estados:** loading, error, not-found (`NOT_FOUND`).

Navega para `sharing/account/[id]` para configurar compartilhamento (ver [`../../navigation.md`](../../navigation.md)).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).

---

# Detalhe de cartão

**Rota:** `/(app)/card/[id]` (`apps/mobile/app/(app)/card/[id].tsx`)

**Query/Mutation GraphQL:** idem `cards(familyId)` (filtra por `id` no client, mesma Suposição #1); `updateCardSharing` acionada a partir desta tela (ver [`sharing-settings.md`](./sharing-settings.md)).

**Estados:** loading, error, not-found.

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
