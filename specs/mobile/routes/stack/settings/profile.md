# Configurações — Menu e Perfil

## Menu de configurações

**Rota:** `/(app)/settings` (`apps/mobile/app/(app)/settings/index.tsx`)

**Query/Mutation GraphQL:** `me` (query).

**Estados:** loading, error.

## Perfil

**Rota:** `/(app)/settings/profile` (`apps/mobile/app/(app)/settings/profile.tsx`)

**Query/Mutation GraphQL:** `me`; `completeUserProfile(input: CompleteProfileInput!)`.

**Estados:** loading, error.

Edita `displayName` e avatar do usuário.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../../auth/login.md`](../../auth/login.md) e [`../../tabs/transactions.md`](../../tabs/transactions.md).
