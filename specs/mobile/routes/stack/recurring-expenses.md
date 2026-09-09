# Contas recorrentes

## Listar

**Rota:** `/(app)/recurring-expenses` (`apps/mobile/app/(app)/recurring-expenses/index.tsx`)

**Query/Mutation GraphQL:** `recurringExpenses(familyId: ID!)`.

**Estados:** loading, empty (CTA criar), error.

## Criar

**Rota:** `/(app)/recurring-expenses/new` (`apps/mobile/app/(app)/recurring-expenses/new.tsx`)

**Query/Mutation GraphQL:** `createRecurringExpense(input: CreateRecurringExpenseInput!)`.

**Estados:** loading, error (`BAD_USER_INPUT`).

## Editar

**Rota:** `/(app)/recurring-expenses/[id]/edit` (`apps/mobile/app/(app)/recurring-expenses/[id]/edit.tsx`)

**Query/Mutation GraphQL:** `updateRecurringExpense`, `deleteRecurringExpense`.

**Estados:** loading, error, not-found.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
