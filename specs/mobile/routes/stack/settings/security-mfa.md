# Configurações — Segurança / MFA

**Rota:** `/(app)/settings/security` (`apps/mobile/app/(app)/settings/security.tsx`)

**Query/Mutation GraphQL:** `supabase.auth.mfa.enroll/unenroll/listFactors`; `supabase.auth.signOut({ scope: 'global' })`.

**Estados:** loading, error, step-up requerido (`MFA_REQUIRED`) para ações sensíveis.

`Security -->|signOut global| Login` (ver [`../../../navigation.md`](../../../navigation.md)).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../../auth/login.md`](../../auth/login.md) e [`../../tabs/transactions.md`](../../tabs/transactions.md).
