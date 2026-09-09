# Estratégia de Secrets (Infraestrutura/CI-CD)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Ver também a tabela complementar de least-privilege por segredo de aplicação em [`../security/secrets.md`](../security/secrets.md).

Princípio aplicado: **cada segredo vive apenas onde é consumido**, com o menor escopo possível (PoLP, seção 29 do `claude.md`).

| Segredo | Onde vive | Quem/o que consome | Observação de privilégio mínimo |
|---|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` (staging) | Vercel Env Vars (Preview) + GitHub Actions Secret (`pr-checks`, `deploy-web`) | API na Vercel (Preview), CI de migração | Usuário de banco com permissão restrita ao schema de staging |
| `DATABASE_URL` / `DIRECT_URL` (production) | Vercel Env Vars (Production) + GitHub Actions Secret no **Environment `production`** (gate manual) | API na Vercel (Production), CI de migração em `main` | Usuário de banco de produção, sem acesso de superuser |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Env Vars apenas (nunca em CI, nunca no client) | Somente rotas server-side administrativas (ex.: exclusão de conta LGPD) | Nunca exposta em log, nunca em variável `EXPO_PUBLIC_*` |
| `SUPABASE_ANON_KEY` | Vercel Env Vars + EAS Secrets (build mobile) | App mobile e API | Chave pública por design, mas ainda assim específica por ambiente (dev/staging vs. production) |
| `PLUGGY_CLIENT_ID/SECRET` (sandbox) | Vercel Env Vars (dev/staging) + GitHub Actions Secret (integration tests, se necessário) | API em dev/staging | Restrito ao ambiente sandbox do Pluggy — nunca reutilizar credencial de produção em teste |
| `PLUGGY_CLIENT_ID/SECRET` (produção) | Vercel Env Vars (Production) apenas | API em produção | Acesso de produção nunca chega a um runner de CI de PR (só ao workflow de deploy em `main`, via Environment protegido) |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | GitHub Actions Secrets | Workflow `deploy-web.yml` | Token de deploy escopado ao projeto, não a conta pessoal inteira |
| `EXPO_TOKEN` | GitHub Actions Secrets | Workflow `build-mobile.yml` | Token de robô (service account do Expo), não token pessoal do dev |
| `SSL_PIN_PRIMARY` / `SSL_PIN_BACKUP` | EAS Secrets (por profile) + Vercel Env Vars (para gerar o header/relatório de pin correspondente) | Build mobile + eventual endpoint de relatório de pinning | Rotação documentada na seção 6 de `00-DECISIONS.md` |
| `SENTRY_DSN_*` | Vercel Env Vars (backend) e EAS Secrets (mobile) | Runtime de erro de cada app | DSN não é segredo crítico (é destinado a ingest), mas mantido fora do código-fonte |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` | GitHub Actions Secrets (Environment `production`) | Workflow `backup-postgres.yml` apenas | Chave de acesso restrita ao bucket `vidinha-backups`, sem permissão de delete em massa |

Regras gerais:
- Nenhum segredo é definido em nível de repositório sem escopo — sempre em **GitHub Environments** (`staging`, `production`) quando o valor difere entre ambientes, permitindo *required reviewers* nos ambientes sensíveis.
- Segredos de produção nunca são acessíveis a partir de um workflow disparado por PR de fork (GitHub Actions já bloqueia isso por padrão para `pull_request` de forks — manter esse comportamento, nunca migrar para `pull_request_target` sem necessidade).
- Rotação: qualquer segredo de terceiro (Pluggy, Supabase Service Role, EAS/Vercel tokens) deve ter data de rotação registrada num checklist operacional (fora do escopo deste documento, mas referenciado aqui como pendência de processo).
