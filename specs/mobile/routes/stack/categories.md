# Categorias

## Listar

**Rota:** `/(app)/categories` (`apps/mobile/app/(app)/categories/index.tsx`)

**Query/Mutation GraphQL:** `categories(familyId: ID!)`.

**Estados:** loading, empty, error.

## Criar

**Rota:** `/(app)/categories/new` (`apps/mobile/app/(app)/categories/new.tsx`)

**Query/Mutation GraphQL:** `createCategory(input: CreateCategoryInput!)`.

**Estados:** loading, error.

## Editar

**Rota:** `/(app)/categories/[id]/edit` (`apps/mobile/app/(app)/categories/[id]/edit.tsx`)

**Query/Mutation GraphQL:** `updateCategory`, `deleteCategory`.

**Estados:** loading, error, not-found.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
