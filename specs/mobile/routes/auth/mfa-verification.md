# Verificação MFA

**Rota:** `/(auth)/mfa-challenge` (`apps/mobile/app/(auth)/mfa-challenge.tsx`)

**Query/Mutation GraphQL:** nenhuma no NestJS; `supabase.auth.mfa.challengeAndVerify`.

**Estados:** loading, error (código inválido).

Acionada a partir de `login.tsx` (ver [`login.md`](./login.md)) quando `aal.nextLevel === 'aal2'`. Em caso de sucesso, segue para `CheckFamily` (ver [`../../navigation.md`](../../navigation.md)).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`login.md`](./login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
