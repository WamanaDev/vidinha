# Esqueci senha / Redefinir senha

## Esqueci minha senha

**Rota:** `/(auth)/forgot-password` (`apps/mobile/app/(auth)/forgot-password.tsx`)

**Query/Mutation GraphQL:** nenhuma no NestJS; `supabase.auth.resetPasswordForEmail`.

**Estados:** loading, success (mensagem neutra, não confirma se e-mail existe).

## Redefinir senha

**Rota:** `/(auth)/reset-password` (`apps/mobile/app/(auth)/reset-password.tsx`)

**Query/Mutation GraphQL:** nenhuma no NestJS; `supabase.auth.updateUser({ password })`.

**Estados:** loading, error.

Fluxo: `Forgot --> ResetPassword --> Login` (ver [`../../navigation.md`](../../navigation.md)).

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`login.md`](./login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
