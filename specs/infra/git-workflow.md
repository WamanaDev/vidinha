# Vidinha — Política de Git, Branches, Commits e Versionamento

**Status:** Decisão fechada, aplica-se a partir do primeiro commit do projeto.
**Escopo:** Estrutura de repositório, estratégia de branches, convenção de commits, Pull Requests, code review, versionamento semântico e releases — adaptado ao contexto real do Vidinha (equipe pequena, deploy contínuo do backend via Vercel, releases de app mobile sujeitas a revisão de loja).

Este documento resolve o ponto que não estava coberto em nenhuma spec anterior. Referencia-se a partir de [00-overview.md](./00-overview.md) e de `specs/00-DECISIONS.md`.

---

## 1. Estrutura de repositório: Monorepo

**Decisão:** um único repositório Git para todo o projeto, usando **pnpm workspaces**.

```text
vidinha/
├── apps/
│   ├── api/              # Backend NestJS + Prisma + GraphQL (deploy: Vercel)
│   └── mobile/           # App Expo + React Native (build: EAS)
├── packages/
│   ├── graphql-schema/   # SDL do GraphQL, fonte única (schema.graphql versionado)
│   ├── graphql-types/    # Tipos TypeScript gerados via GraphQL Code Generator
│   │                     # (consumidos por apps/api e apps/mobile)
│   └── config/           # tsconfig base, eslint config, prettier config compartilhados
├── .github/
│   └── workflows/        # CI/CD (ver ci-cd-*.md) — usar path filters por app
├── specs/                # Este diretório de specs
├── branding/
├── pnpm-workspace.yaml
├── package.json           # scripts raiz (turbo/pnpm -r), husky, commitlint
├── turbo.json              # (opcional) cache de build/test entre apps/packages
└── CHANGELOG.md            # gerado por app (ver seção 8)
```

**Justificativa:** o app mobile e o backend compartilham o contrato GraphQL (schema e tipos gerados). Um monorepo evita duplicar/perder sincronismo entre o SDL definido em `specs/backend/` e os tipos usados no app mobile. O custo (tooling de versionamento independente) é resolvido com **Changesets** (seção 8).

**Nota de compatibilidade com specs já escritas:** as árvores de pastas descritas em `specs/backend/00-overview.md` (`src/...`) e `specs/mobile/00-overview.md` (`app/...`, `src/...`) devem ser lidas como relativas a `apps/api/` e `apps/mobile/`, respectivamente, dentro deste monorepo. Da mesma forma, os workflows em `ci-cd-pr-checks.md`, `ci-cd-deploy-web.md` e `ci-cd-build-mobile.md` devem usar `working-directory: apps/api` / `apps/mobile` e **path filters** (`paths:` no trigger do workflow) para não rodar CI de mobile quando só o backend mudou, e vice-versa. Isso é um ajuste mecânico de caminho, não uma mudança de arquitetura.

---

## 2. Estratégia de branches: GitHub Flow

**Decisão:** **GitHub Flow**, não Git Flow.

Justificativa: o backend já está definido para deploy contínuo (preview por PR, produção no merge da `main`, ver `specs/infra/environments.md`). Não há necessidade de uma branch `develop` de longa duração nem de branches `release/*` — isso só adicionaria complexidade sem benefício para uma equipe pequena com entrega contínua.

```text
main                        ← sempre estável e deployável (produção)
  ├── feature/<escopo>      ← nova funcionalidade
  ├── fix/<escopo>          ← correção de bug (não urgente)
  ├── hotfix/<escopo>       ← correção urgente em produção
  ├── refactor/<escopo>     ← refatoração sem mudança de comportamento
  ├── chore/<escopo>        ← manutenção (deps, config, tooling)
  ├── docs/<escopo>         ← documentação/specs
  ├── test/<escopo>         ← testes
  └── ci/<escopo>           ← pipeline/workflows
```

Exemplos de nomes reais para o Vidinha:

```text
feature/api-family-module
feature/mobile-onboarding-flow
fix/api-last-admin-removal
hotfix/mobile-ssl-pin-expired
refactor/api-casl-ability-factory
chore/deps-update-prisma
docs/specs-git-workflow
```

Regra de escopo no nome da branch: prefixar com `api-` ou `mobile-` quando a alteração for isolada a um app, sem prefixo quando afetar ambos (ex.: `feature/graphql-schema-sharing-permissions` quando muda o contrato compartilhado).

**Fluxo:**

```text
main
  ↓ (branch a partir de main, sempre atualizada)
feature/api-family-module
  ↓ (commits pequenos e coerentes)
Pull Request → main
  ↓
CI (lint, typecheck, testes, audit, snapshot GraphQL — com path filter por app)
  ↓
Code Review (ver seção 6)
  ↓
Squash Merge → main
  ↓
Deploy automático (Vercel produção se apps/api mudou; EAS/Update se apps/mobile mudou)
```

Branches devem ser de curta duração (idealmente mescladas em até 3-5 dias). Branches abandonadas devem ser excluídas após o merge (delete automático habilitado no GitHub).

---

## 3. Branch principal (`main`)

- É a única branch de longa duração.
- **Protegida** (ver seção 7): sem push direto, sem force push, exige Pull Request.
- Sempre deve representar um estado deployável tanto do backend quanto do app mobile.
- Tags de release (seção 8) sempre apontam para commits em `main`.

---

## 4. Commits: Conventional Commits (obrigatório, validado em CI)

**Decisão:** todo commit deve seguir o padrão **Conventional Commits**, validado automaticamente via `commitlint` + hook `commit-msg` do **Husky**, e novamente checado no workflow de PR checks (`ci-cd-pr-checks.md`).

```text
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional, ex. BREAKING CHANGE: ...]
```

### Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `perf` | Melhoria de performance |
| `test` | Testes |
| `docs` | Documentação/specs |
| `chore` | Manutenção (deps, config) |
| `build` | Build/empacotamento |
| `ci` | Pipeline/workflows |
| `style` | Formatação (sem mudança de lógica) |
| `revert` | Reversão de commit |

### Escopos recomendados (não exaustivo)

`api`, `mobile`, `auth`, `family`, `open-finance`, `accounts`, `transactions`, `sharing`, `design-system`, `deps`, `ci`.

### Exemplos reais para o Vidinha

```text
feat(api-family): add promoteMember mutation with last-admin guard
fix(mobile-transactions): correct cursor pagination on empty page
refactor(api-casl): extract ability factory into common module
test(api-family): cover last admin removal rule
chore(deps): bump prisma to 5.20
docs(specs): add git workflow policy
feat(mobile-auth)!: require MFA verification screen after login

BREAKING CHANGE: login flow now redirects to /mfa-verification when
Supabase reports aal1 with MFA enrolled, changing the post-login route contract.
```

### Regras

- Mensagens em **inglês** no corpo técnico do commit (consistência com nomes de código/API), mesmo que a documentação do projeto seja em português — isso é uma convenção comum a projetos que podem abrir código no futuro; times 100% internos podem optar por português, mas devem ser consistentes.
- Nunca incluir segredos, tokens ou dados de usuário reais na mensagem de commit.
- Commits pequenos e coerentes — um commit, uma mudança lógica.
- `git commit --amend` e `rebase -i` são permitidos **apenas em branches próprias não compartilhadas**, antes de abrir o PR ou enquanto ninguém mais commitou na mesma branch.

---

## 5. Pull Requests

Todo PR para `main` deve usar o template `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## O que mudou
<!-- Descreva a alteração em 1-3 frases -->

## Por quê
<!-- Problema resolvido ou funcionalidade entregue -->

## App(s) afetado(s)
- [ ] apps/api
- [ ] apps/mobile
- [ ] packages/graphql-schema (mudança de contrato — avisar o outro app)

## Como foi validado
<!-- Testes automatizados, teste manual, screenshot/vídeo se for UI -->

## Checklist
- [ ] Segue Conventional Commits
- [ ] Testes adicionados/atualizados
- [ ] Sem segredos/dados sensíveis no diff
- [ ] Se mudou o schema GraphQL: `packages/graphql-schema` foi regenerado e ambos os apps compilam
- [ ] Se mudou o schema Prisma: migration criada e testada localmente
```

PRs devem ter **escopo controlado** — se um PR mistura `apps/api` e `apps/mobile` sem relação com um contrato compartilhado, deve ser dividido em dois PRs.

---

## 6. Code Review

- Para um único desenvolvedor/fundador: revisão própria assistida por checklist do PR template + CI obrigatório verde antes do merge (a "segunda opinião" nesse estágio é o CI + o code-review automatizado, não uma pessoa).
- Assim que houver um segundo colaborador: **1 aprovação obrigatória** antes do merge, revisão focando correção, segurança (ver `specs/security/`), legibilidade e cobertura de teste.
- PRs que tocam `packages/graphql-schema`, autenticação/autorização (`src/auth`, `src/casl`) ou qualquer coisa em `specs/security/` exigem atenção redobrada a regressão de segurança.

---

## 7. Proteção de branch (`main`)

Configurar no GitHub (Settings → Branches → Branch protection rules):

- Exigir Pull Request antes do merge (sem push direto).
- Exigir que os status checks do workflow `pr-checks.yml` passem (lint, typecheck, testes, audit, snapshot GraphQL).
- Exigir branch atualizada com `main` antes do merge (evita merge de código desatualizado).
- Bloquear force push.
- Bloquear exclusão da branch `main`.
- Exigir 1 aprovação assim que houver mais de um colaborador (ver seção 6).
- Sem bypass para administradores, exceto em incidente documentado (ver `specs/security/incident-response.md`).

---

## 8. Versionamento semântico e releases (via Changesets)

Como `apps/api` e `apps/mobile` têm ciclos de release **independentes** (backend: deploy contínuo; mobile: sujeito a build EAS e revisão de loja), cada um é versionado separadamente dentro do mesmo monorepo usando **Changesets**.

### Fluxo

1. Todo PR que muda comportamento visível de `apps/api` ou `apps/mobile` deve incluir um changeset:
   ```bash
   pnpm changeset
   ```
   Isso gera um arquivo em `.changeset/*.md` descrevendo o tipo de bump (`patch`/`minor`/`major`) e uma descrição, por pacote afetado.
2. O CI (`pr-checks.yml`) falha se houver mudança de código em `apps/api` ou `apps/mobile` sem changeset correspondente (checagem via `changeset status`), exceto para commits `chore`/`docs`/`ci`/`test` que não afetam comportamento.
3. Ao mergear em `main`, um workflow `release.yml` (novo, adicionar à lista de workflows de `specs/infra/`) roda `changeset version` e abre automaticamente um **"Version Packages" PR** consolidando os bumps pendentes e atualizando `apps/api/CHANGELOG.md` / `apps/mobile/CHANGELOG.md`.
4. Ao mergear o PR de versão, o mesmo workflow:
   - Cria a tag Git `api-vX.Y.Z` (se `apps/api` mudou) e/ou `mobile-vX.Y.Z` (se `apps/mobile` mudou) — tags prefixadas por app, nunca uma tag genérica `vX.Y.Z`, para não ambiguar qual app foi versionado.
   - Publica uma GitHub Release para cada tag, usando o changelog gerado.
   - No caso de `apps/mobile`, também sincroniza `expo.version` em `app.config.ts` e incrementa `ios.buildNumber`/`android.versionCode` automaticamente antes de disparar o workflow `ci-cd-build-mobile.md`.

### Regras de SemVer aplicadas ao Vidinha

| Mudança | Bump | Exemplo |
|---|---|---|
| Campo obrigatório novo em input GraphQL, remoção de campo, mudança de comportamento de auth | `major` | `feat(api)!: ...` |
| Nova query/mutation, novo campo opcional, nova tela | `minor` | `feat(api): ...` / `feat(mobile): ...` |
| Correção de bug, ajuste de performance, refactor interno | `patch` | `fix(...)`, `perf(...)`, `refactor(...)` |

Breaking changes em `packages/graphql-schema` **sempre** forçam um `major` bump em `apps/api` e disparam um alerta manual para verificar se `apps/mobile` também precisa de release coordenada (ver estratégia de deprecação em `specs/backend/00-overview.md`, seção de versionamento do schema).

### Rollback

```text
GitHub Release (tag api-vX.Y.Z)
        ↓
Commit correspondente em main
        ↓
Vercel: promover deployment anterior (rollback nativo da Vercel, sem git revert)
        ↓
Mobile: EAS Update rollback (canal de update) ou nova build com versão anterior se o problema for nativo
```

Preferir o rollback nativo da plataforma de deploy (Vercel/EAS) a `git revert` sempre que a urgência exigir reversão imediata; o `git revert` formal deve ser feito em seguida para manter o histórico do `main` consistente com o que está de fato em produção.

---

## 9. Automação (Husky + lint-staged + CI)

- **Husky** `commit-msg`: valida Conventional Commits via `commitlint`.
- **Husky** `pre-commit`: roda `lint-staged` (ESLint + Prettier apenas nos arquivos staged, por workspace).
- **CI (`pr-checks.yml`)**: lint, typecheck, testes, `pnpm audit`, snapshot do schema GraphQL, verificação de changeset pendente — todos com path filter por app para não rodar suíte de mobile em PR que só toca `apps/api` (e vice-versa), exceto quando `packages/` muda (roda ambos).
- **Dependabot**: habilitado para todos os workspaces do monorepo (gratuito no GitHub).

---

## 10. Resumo do fluxo completo

```text
Tarefa/Issue
     ↓
Branch (feature/fix/hotfix/refactor/chore/docs/test/ci) a partir de main
     ↓
Commits (Conventional Commits, validados por Husky)
     ↓
pnpm changeset (se houver mudança de comportamento)
     ↓
Pull Request → main (template obrigatório)
     ↓
CI: lint + typecheck + testes + audit + snapshot GraphQL + changeset status
     ↓
Code Review (checklist ou aprovação de outro colaborador)
     ↓
Squash Merge → main
     ↓
Deploy automático: Vercel (apps/api) e/ou trigger de build EAS (apps/mobile)
     ↓
Workflow release.yml: changeset version → PR de versão → merge → tag(s) + GitHub Release(s)
```

---

## Suposições desta spec

1. **Squash merge** como estratégia única de integração (não merge commit, não rebase+fast-forward) — mantém o histórico de `main` linear e legível, com uma entrada por PR; decisão simples e consistente com equipe pequena, sem necessidade de preservar granularidade de commits de branch de feature.
2. **Husky + commitlint + lint-staged + Changesets** como ferramentas concretas — todas gratuitas e padrão de mercado para este cenário; podem ser substituídas por equivalentes (ex. `simple-git-hooks`, `release-please`) sem mudar a política em si.
3. Mensagens de commit em inglês é uma recomendação, não bloqueio automatizado — o `commitlint` valida o formato Conventional Commits, não o idioma.
4. `packages/graphql-schema` e `packages/graphql-types` como nomes de pacote compartilhado são uma proposta desta spec; não estavam definidos em nenhuma spec anterior porque a estrutura de monorepo só foi decidida agora. Isso deve ser refletido como ajuste futuro (path prefixes) em `specs/backend/00-overview.md`, `specs/mobile/00-overview.md` e nos três workflows de CI existentes (`ci-cd-pr-checks.md`, `ci-cd-deploy-web.md`, `ci-cd-build-mobile.md`), que hoje descrevem `apps/api` e `apps/mobile` como se fossem a raiz do repositório. Esse ajuste é mecânico (adicionar `working-directory` e `paths:` de trigger) e não muda nenhuma decisão de arquitetura já tomada.
