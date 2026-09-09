# Detalhe de transação

**Rota:** `/(app)/transaction/[id]` (`apps/mobile/app/(app)/transaction/[id].tsx`)

**Query/Mutation GraphQL:** dado vindo da lista (cache TanStack Query, populado por `transactions(filter, first)` — ver [`../tabs/transactions.md`](../tabs/transactions.md)) + `updateTransactionCategory`.

**Estados:** loading, error, not-found.

## Ocultar transação (ação inline, não é rota própria)

**Query/Mutation GraphQL:** `hideTransaction(input: HideTransactionInput!)`.

**Estados:** loading (toggle), error (revert otimista).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
