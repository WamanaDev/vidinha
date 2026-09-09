# Common — Rate limiting (@nestjs/throttler) e CORS

**Extraído de:** `specs/02-API-AUTH.md §5` (Rate limiting e CORS). Ver [`../00-overview.md`](../00-overview.md) para o índice completo.

---

## 1. Rate limiting (`@nestjs/throttler`, em memória no MVP)

Como a API roda em Vercel Serverless (instâncias efêmeras, sem estado compartilhado), o rate limit em memória é **por instância**, não global — mitigação parcial aceitável para o MVP (documentado como limitação conhecida, mesma lógica do item 79 de `00-DECISIONS.md` sobre migrar para Upstash Redis quando houver mais de 1 instância relevante).

Estratégia de *named throttlers*, aplicados por operação GraphQL via decorator customizado (`@Throttle()` em cada resolver/mutation, já que todo tráfego GraphQL entra pelo mesmo endpoint HTTP `/graphql`):

```typescript
// apps/api/src/app.module.ts (trecho)
ThrottlerModule.forRoot([
  { name: 'default', ttl: 60_000, limit: 120 },   // queries de leitura em geral
  { name: 'auth-sensitive', ttl: 60_000, limit: 5 }, // completeUserProfile, requestAccountDeletion
  { name: 'invite', ttl: 60_000, limit: 10 },       // inviteMember (evita spam de convites)
  { name: 'openfinance-sync', ttl: 60_000, limit: 6 }, // syncOpenFinanceConnection (respeita rate limit do Pluggy)
  { name: 'mutation-write', ttl: 60_000, limit: 60 },  // demais mutations de escrita
]);
```

Notas:

- Não há mutation de **login** no NestJS (login ocorre direto no Supabase, que já tem seu próprio rate limiting de auth) — por isso o throttler do backend foca em operações pós-autenticação.
- Chave de limitação: por padrão `@nestjs/throttler` usa IP; **recomendação: usar `userId` (do JWT) como chave quando autenticado**, caindo para IP apenas em operações públicas, para evitar que um usuário atrás de NAT compartilhado penalize outros. Implementado em `apps/api/src/common/guards/gql-throttler.guard.ts` (adapta `@nestjs/throttler` ao contexto GraphQL).
- `RATE_LIMITED` retorna `extensions.code = 'RATE_LIMITED'` com `Retry-After` quando aplicável (ver [`exception-filter.md`](./exception-filter.md) para o formato de erro completo).

## 2. CORS

Política restritiva — sem `origin: '*'` em nenhum ambiente:

```typescript
app.enableCors({
  origin: (origin, callback) => {
    const allowlist = [
      // apps mobile Expo não enviam Origin (React Native não é um browser) —
      // requisições sem Origin são permitidas apenas quando autenticadas via Bearer token válido.
      'https://admin.vidinha.app',        // futuro painel web administrativo
      'https://staging-admin.vidinha.app',
      ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:19006', 'http://localhost:3000'] : []),
    ];
    if (!origin || allowlist.includes(origin)) return callback(null, true);
    callback(new Error('Origin não permitida por política de CORS'));
  },
  credentials: false, // autenticação via Authorization: Bearer, não via cookies
  methods: ['POST', 'OPTIONS'],
});
```

- O app mobile (Expo) não é afetado por CORS (requisições nativas não enviam `Origin` de navegador); a política acima protege principalmente o futuro painel web admin e ferramentas como GraphQL Playground/Apollo Studio em `development`.
- `credentials: false` porque a autenticação é feita via header `Authorization`, não via cookies — reduz superfície de CSRF.
- Esta mesma configuração de CORS é aplicada no handler serverless (`api/graphql.ts`) — ver [`vercel-serverless-handler.md`](./vercel-serverless-handler.md).
