# Vidinha — Guia de Implementação do Backend

**Este documento foi reestruturado.**

Todo o conteúdo anteriormente aqui (estrutura de pastas NestJS, convenções de código, exemplo completo do módulo `family`, configuração global de guards/filters, adaptação Vercel Serverless, ordem de implementação dos módulos) foi reorganizado por domínio/responsabilidade na árvore `specs/backend/`, sem perda de informação.

**Comece por:** [`specs/backend/00-overview.md`](./backend/00-overview.md) — contém o índice completo apontando para:

- `specs/backend/00-overview.md` — estrutura de pastas, convenções, ordem de implementação.
- `specs/backend/common/vercel-serverless-handler.md` — `main.ts`, `api/graphql.ts`, PrismaService serverless.
- `specs/backend/modules/family/*.md` — exemplo completo de código do módulo `family` (referência de padrão).
- `specs/backend/modules/*/*.module.md` — demais módulos de domínio.
