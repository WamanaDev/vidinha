# CI/CD — `pr-checks.yml` (Checks de Pull Request)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Ajustado ao monorepo (`apps/api`, `apps/mobile`, `packages/*`) — ver `00-DECISIONS.md` §11 e [git-workflow.md](./git-workflow.md).

Roda em todo PR contra `main`. Bloqueia merge se qualquer job falhar (branch protection).

Abordagem escolhida para path filtering: um job `changes` inicial usando `dorny/paths-filter` detecta quais áreas do monorepo mudaram (`api`, `mobile`, `shared` para `packages/**`), e os demais jobs usam `if:` condicionado à saída desse job — evitando duplicar o trigger do workflow em dois arquivos separados. Mudança em `packages/**` (`shared`) força os jobs de **ambos** os apps a rodar, conforme `git-workflow.md` §9.

```yaml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      mobile: ${{ steps.filter.outputs.mobile }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'apps/api/**'
            mobile:
              - 'apps/mobile/**'
            shared:
              - 'packages/**'

  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Validar Conventional Commits do PR
        run: pnpm dlx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose

  changeset-check:
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.mobile == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Checar changeset pendente
        run: pnpm changeset status --since=origin/main

  lint-typecheck-api:
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/api
        run: pnpm lint
      - working-directory: apps/api
        run: pnpm typecheck

  unit-tests-api:
    runs-on: ubuntu-latest
    needs: [changes, lint-typecheck-api]
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/api
        run: pnpm test:unit -- --coverage

  integration-tests-api:
    runs-on: ubuntu-latest
    needs: [changes, lint-typecheck-api]
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/api
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/vidinha_test
      - working-directory: apps/api
        run: pnpm test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/vidinha_test

  graphql-schema-check:
    runs-on: ubuntu-latest
    needs: [changes, lint-typecheck-api]
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/api
        run: pnpm graphql:generate-schema  # gera schema.graphql a partir do código NestJS, em packages/graphql-schema
      - run: git diff --exit-code packages/graphql-schema/schema.graphql || (echo "Schema mudou e não foi commitado, ou há breaking change não revisado" && exit 1)

  lint-typecheck-mobile:
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.mobile == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/mobile
        run: pnpm lint
      - working-directory: apps/mobile
        run: pnpm typecheck

  unit-tests-mobile:
    runs-on: ubuntu-latest
    needs: [changes, lint-typecheck-mobile]
    if: needs.changes.outputs.mobile == 'true' || needs.changes.outputs.shared == 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/mobile
        run: pnpm test:unit -- --coverage

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high  # roda na raiz do workspace (pnpm -r), cobre todos os apps/packages
```

Notas:
- `changes` roda sempre (barato) e alimenta o `if:` dos demais jobs — mudança só em `apps/api` não dispara jobs de `apps/mobile` e vice-versa; mudança em `packages/**` dispara ambos.
- `commitlint` e `changeset-check` (seção 4 e 8 de `git-workflow.md`) rodam para todo PR que altera `apps/api`, `apps/mobile` ou `packages/**`; `changeset status --since=origin/main` falha o job se houver commit de comportamento sem changeset correspondente.
- `integration-tests-api` usa um Postgres efêmero via `services:` do próprio runner (não toca Supabase), mantendo o CI independente e gratuito.
- `graphql-schema-check` garante que `packages/graphql-schema/schema.graphql` está sempre atualizado; uma checagem adicional (breaking-change linter, ex. `graphql-inspector`) pode ser adicionada depois sem mudar a estrutura.
- `dependency-audit` continua rodando na raiz do workspace (não tem `working-directory` por app) porque `pnpm audit` já cobre todo o monorepo de uma vez.
- Dependabot (`.github/dependabot.yml`) complementa o `pnpm audit`, abrindo PRs automáticos de atualização para cada workspace (`apps/api`, `apps/mobile`, `packages/*`) — gratuito no GitHub.
