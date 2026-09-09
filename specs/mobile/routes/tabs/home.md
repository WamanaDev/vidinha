# Início / Dashboard

**Rota:** `/(app)/(tabs)/` (`apps/mobile/app/(app)/(tabs)/index.tsx`)

**Query/Mutation GraphQL:** `accounts(familyId)`, `cards(familyId)`, `transactions(filter, first)`, `recurringExpenses(familyId)` — compostas em `useDashboardSummary` (`apps/mobile/src/features/dashboard/hooks`).

**Estados:** loading (skeleton dos cards), empty (nenhuma conta conectada → CTA para Open Finance), error.

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`transactions.md`](./transactions.md).
