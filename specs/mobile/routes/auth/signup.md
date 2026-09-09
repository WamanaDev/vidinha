# Cadastro

**Rota:** `/(auth)/sign-up` (`apps/mobile/app/(auth)/sign-up.tsx`)

**Query/Mutation GraphQL:** nenhuma no NestJS; `supabase.auth.signUp`.

**Estados:** loading, error (email já existe → `CONFLICT`-like do Supabase).

Após confirmação de e-mail, o app chama a mutation `completeUserProfile(input: CompleteProfileInput!)` (primeiro login) antes de decidir o destino (ver [`../../navigation.md`](../../navigation.md) — fluxo `SignUp -->|confirma e-mail + completeUserProfile| CheckFamily`).

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`login.md`](./login.md) e [`../tabs/transactions.md`](../tabs/transactions.md) (estrutura de componente, tratamento de loading/error, uso do design system em `@components/*`, path aliases).
