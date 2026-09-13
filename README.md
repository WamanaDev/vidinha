# Vidinha

Gestão financeira compartilhada para casais e famílias. Mobile-first, integração Open Finance via Pluggy, sem movimentar dinheiro.

## Estrutura (monorepo, pnpm workspaces)

```text
apps/
  api/      Backend NestJS + Prisma + GraphQL (deploy: Vercel)
  mobile/   App Expo + React Native (build: EAS)
packages/
  graphql-schema/   SDL do GraphQL, fonte única
  graphql-types/    Tipos TS gerados via GraphQL Code Generator
  config/           tsconfig/eslint/prettier compartilhados
specs/      Especificação técnica completa (produto, dados, backend, mobile, design, infra, segurança)
branding/   Estratégia de marca, tom de voz, identidade visual
```

## Por onde começar

Toda decisão de produto e arquitetura está em [`specs/00-DECISIONS.md`](specs/00-DECISIONS.md). A ordem recomendada de implementação do backend está em [`specs/backend/00-overview.md`](specs/backend/00-overview.md); a estrutura do app mobile em [`specs/mobile/00-overview.md`](specs/mobile/00-overview.md). Política de Git/branches/commits/versionamento em [`specs/infra/git-workflow.md`](specs/infra/git-workflow.md).

## Setup local

```bash
pnpm install
pnpm prepare        # instala hooks do Husky (commitlint + lint-staged)
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Preencha os `.env` com credenciais reais (Supabase, Pluggy, Sentry) — nunca commitadas. Ver [`specs/infra/environments.md`](specs/infra/environments.md) e [`specs/infra/secrets-management.md`](specs/infra/secrets-management.md).

### Rodando o app mobile localmente (Android via adb)

```bash
cd apps/mobile
pnpm exec expo run:android   # build nativo local + instala via adb, sem precisar de conta EAS
```

**No Windows**, esse build nativo pode falhar com `Filename longer than 260 characters` — o `ninja.exe` do Android SDK não respeita o `LongPathsEnabled` do Windows, mesmo com o registro configurado. Se isso acontecer, encurte o local onde o pnpm guarda os pacotes criando um `.npmrc` **local** (não versionado — o caminho é específico da sua máquina/drive) na raiz do repositório:

```ini
# .npmrc (não commitar — mantenha na mesma unidade/drive do projeto)
virtual-store-dir=E:/.pnpm-vidinha
```

Depois rode `pnpm install` de novo (ele vai perguntar antes de realocar os pacotes) e tente o build novamente.

## Convenções

- Commits: [Conventional Commits](specs/infra/git-workflow.md#4-commits-conventional-commits-obrigatório-validado-em-ci), validados por Husky.
- Branches: GitHub Flow (`feature/*`, `fix/*`, `hotfix/*`, ...), sempre a partir de `main`.
- Toda mudança de comportamento precisa de um changeset: `pnpm changeset`.
