# Configurações — Exportar dados / Excluir conta

## Exportar dados

**Rota:** `/(app)/settings/export-data` (`apps/mobile/app/(app)/settings/export-data.tsx`)

**Query/Mutation GraphQL:** `exportMyData` (mutation) → retorna `downloadUrl`/`expiresAt`.

**Estados:** loading, error, success (mostra link com expiração).

## Excluir conta

**Rota:** `/(app)/settings/delete-account` (`apps/mobile/app/(app)/settings/delete-account.tsx`)

**Query/Mutation GraphQL:** `requestAccountDeletion`.

**Estados:** loading, error, confirmação destrutiva (dupla confirmação + possível `MFA_REQUIRED`).

`DeleteAccount -->|requestAccountDeletion confirmado| Login` (ver [`../../../navigation.md`](../../../navigation.md)).

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../../auth/login.md`](../../auth/login.md) e [`../../tabs/transactions.md`](../../tabs/transactions.md).
