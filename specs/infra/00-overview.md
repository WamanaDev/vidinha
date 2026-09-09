# Vidinha — Infraestrutura e CI/CD (v1)

**Status:** Especificação técnica derivada das decisões de `00-DECISIONS.md`, seção 7 ("Infraestrutura — custo zero").
**Escopo:** Detalha diagrama de infraestrutura, ambientes, pipelines de CI/CD, estratégia de secrets, limitações do arranjo gratuito e observabilidade prática.

Este documento não contradiz `00-DECISIONS.md`. Onde uma decisão concreta era necessária e não estava coberta lá (ex.: nomes exatos de variáveis de ambiente, estrutura de workflows YAML), a decisão mais simples foi tomada e está registrada na seção "Suposições desta spec" (final deste documento).

Este conteúdo foi reestruturado em múltiplos arquivos, listados no índice abaixo. Este arquivo (`00-overview.md`) mantém o diagrama de infraestrutura completo e serve como ponto de entrada.

---

## 1. Diagrama de Infraestrutura

```text
                         ┌────────────────────────────┐
                         │   Usuário (casal/família)   │
                         └──────────────┬─────────────┘
                                        │
                                        ▼
                     ┌──────────────────────────────────┐
                     │  App Mobile (Expo / React Native) │
                     │  - Dev Client customizado (SSL    │
                     │    pinning, não roda no Expo Go)  │
                     │  - Distribuído via EAS Build       │
                     │  - Atualizações incrementais via   │
                     │    EAS Update (OTA)                │
                     └──────────────┬────────────────────┘
                                    │ HTTPS + SSL Pinning
                                    │ GraphQL (POST /graphql)
                                    ▼
                     ┌──────────────────────────────────┐
                     │  Vercel (Serverless Functions)    │
                     │  - API NestJS + GraphQL (Apollo)  │
                     │  - Preview deploy por PR           │
                     │  - Produção no merge da main       │
                     └───────┬───────────────────┬───────┘
                             │                   │
                 Prisma Client                   │ REST (Pluggy SDK/API)
                             ▼                   ▼
             ┌───────────────────────┐  ┌───────────────────────┐
             │ Supabase (Postgres +  │  │ Pluggy (Open Finance)  │
             │ Auth)                 │  │ - Sandbox (dev/staging)│
             │ - projeto staging     │  │ - Produção (prod)      │
             │ - projeto production  │  │ - Webhook item/updated │
             └───────────┬───────────┘  └───────────────────────┘
                         │
                         │ pg_dump (semanal, via job agendado)
                         ▼
             ┌───────────────────────┐
             │ Cloudflare R2 (Free)  │
             │ Backup externo do DB  │
             └───────────────────────┘

   Cadeia de suporte (transversal a todas as camadas acima):

   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
   │ GitHub Actions      │   │ Sentry (Free)       │   │ Expo EAS (Free)     │
   │ - CI (lint/test/    │   │ - Erros backend      │   │ - Build Android/iOS │
   │   typecheck/audit)  │   │   (NestJS)           │   │ - Dev client custom │
   │ - CD (Vercel + EAS) │   │ - Erros mobile (app) │   │ - EAS Update (OTA)   │
   │ - Cron semanal       │   └────────────────────┘   └────────────────────┘
   │   (backup R2)        │
   └────────────────────┘
```

Fluxo de dados essencial: o app nunca fala diretamente com Supabase ou Pluggy — toda leitura/escrita passa pela API GraphQL na Vercel, que aplica autorização (RBAC/ABAC via CASL) antes de tocar o Prisma ou o SDK do Pluggy. A única exceção é o **Pluggy Connect** (widget de conexão bancária), que roda embutido no app e fala diretamente com o Pluggy para nunca expor credenciais bancárias ao backend do Vidinha.

---

## 2. Índice

- [environments.md](./environments.md) — definição de development/staging/production, variáveis de ambiente por ambiente, estratégia de Prisma Migrate.
- [ci-cd-pr-checks.md](./ci-cd-pr-checks.md) — workflow de PR checks (YAML completo).
- [ci-cd-deploy-web.md](./ci-cd-deploy-web.md) — workflow de deploy backend/web via Vercel (YAML completo).
- [ci-cd-build-mobile.md](./ci-cd-build-mobile.md) — workflow de build mobile via EAS (YAML completo).
- [ci-cd-backup.md](./ci-cd-backup.md) — workflow de backup semanal do Postgres (YAML completo).
- [ci-cd-release.md](./ci-cd-release.md) — workflow de release via Changesets: versionamento, tags por app, GitHub Releases e disparo do build mobile (YAML completo).
- [secrets-management.md](./secrets-management.md) — estratégia de secrets e menor privilégio.
- [observability.md](./observability.md) — configuração de Sentry (backend e mobile) e eventos que geram alerta.
- [known-limitations.md](./known-limitations.md) — tabela de limitações do arranjo custo-zero e gatilhos de migração.
- [git-workflow.md](./git-workflow.md) — estrutura de repositório (monorepo), branches, Conventional Commits, Pull Requests, code review, versionamento semântico e releases.

---

## Suposições desta spec

1. Gerenciador de pacotes considerado nos workflows: **pnpm** (não definido explicitamente em `00-DECISIONS.md`; ajustar os YAMLs para `npm`/`yarn` se o time decidir diferente — a estrutura dos jobs não muda).
2. `development` local compartilha o projeto Supabase de staging, usando schemas Postgres separados por desenvolvedor (`search_path`), com Docker Compose como alternativa documentada para quem preferir isolamento total.
3. Nomes exatos de variáveis de ambiente (ver `environments.md`) são uma proposta inicial; podem ser renomeados sem impacto arquitetural, desde que documentados em `.env.example` no repositório.
4. Ação de upload para Cloudflare R2 no workflow de backup usa uma action de terceiro compatível com S3 (R2 é S3-compatible); a escolha exata da action pode mudar na implementação real sem alterar a estratégia.
5. Gate manual de aprovação em produção (GitHub Environment `production` com required reviewer) é uma decisão de segurança operacional desta spec, não estava explícita em `00-DECISIONS.md`, mas é consistente com os princípios de Fail Secure e Defense in Depth do `claude.md` (seção 55).
6. Cota de builds EAS Free e detalhes de amostragem do Sentry podem mudar conforme os planos gratuitos evoluam; os valores citados são referenciais para orientar o gatilho de migração, não um SLA contratual.
