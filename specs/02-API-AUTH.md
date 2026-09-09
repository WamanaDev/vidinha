# Vidinha — API GraphQL, Autenticação e Autorização

**Este documento foi reestruturado.**

Todo o conteúdo anteriormente aqui (autenticação JWT/JWKS, RBAC+CASL, SDL GraphQL completo por domínio, tratamento de erros, rate limiting, versionamento) foi reorganizado por domínio/responsabilidade na árvore `specs/backend/`, sem perda de informação.

**Comece por:** [`specs/backend/00-overview.md`](./backend/00-overview.md) — contém o índice completo apontando para:

- `specs/backend/common/jwt-auth-guard.md` — validação JWT/JWKS.
- `specs/backend/common/casl-ability-factory.md` — RBAC + ABAC (CASL).
- `specs/backend/common/exception-filter.md` — tratamento de erros.
- `specs/backend/common/rate-limiting.md` — rate limiting e CORS.
- `specs/backend/modules/*/*.module.md` — SDL GraphQL e regras de negócio por domínio.

Ver também `specs/backend/00-overview.md §6` para versionamento do schema GraphQL.
