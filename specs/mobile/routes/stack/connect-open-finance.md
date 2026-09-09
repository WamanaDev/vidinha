# Open Finance — Conectar / Conexões

## Conectar Open Finance

**Rota:** `/(app)/open-finance/connect` (`apps/mobile/app/(app)/open-finance/connect.tsx`)

**Query/Mutation GraphQL:** `pluggyConnectToken` (query) → abre Pluggy Connect SDK → `createOpenFinanceConnection(input: { itemId })`.

**Estados:** loading (gerando token), loading (widget), error (`UPSTREAM_ERROR`).

## Conexões Open Finance

**Rota:** `/(app)/open-finance/connections` (`apps/mobile/app/(app)/open-finance/connections.tsx`)

**Query/Mutation GraphQL:** `openFinanceConnections(familyId)`; `syncOpenFinanceConnection`, `revokeOpenFinanceConnection`.

**Estados:** loading, empty (CTA conectar), error.

Fluxo: `OFConnect -->|createOpenFinanceConnection| OFConnections` (ver [`../../navigation.md`](../../navigation.md)).

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
