# Ambientes

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Ajustado ao monorepo — ver `00-DECISIONS.md` §11 e [git-workflow.md](./git-workflow.md).

**Nota de monorepo sobre `.env`:** cada app tem seu próprio arquivo de variáveis de ambiente, na sua própria pasta — não existe um `.env` único na raiz do repositório:

- Backend: `apps/api/.env` (local) / `apps/api/.env.example` (versionado, sem valores reais); `nest start --watch` e `vercel dev` devem rodar a partir de `apps/api` (ou com `working-directory: apps/api` em scripts/CI).
- Mobile: `apps/mobile/.env` (local, consumido via `app.config.ts`/`expo-constants`) / `apps/mobile/.env.example`; variáveis `EXPO_PUBLIC_*` também podem ser definidas por profile em `apps/mobile/eas.json`.
- `packages/*` (`graphql-schema`, `graphql-types`, `config`) **não têm variáveis de ambiente próprias** — são bibliotecas internas consumidas em tempo de build/import pelos dois apps, sem runtime próprio; nenhuma configuração de ambiente deve ser adicionada ali.
- `docker-compose.yml` para Postgres local (alternativa ao schema compartilhado de staging, ver §1) fica na raiz do repositório (`vidinha/docker-compose.yml`), pois é infraestrutura de desenvolvimento compartilhada entre quem trabalha em `apps/api`, não pertence a um app específico.

## 1. Visão geral

| Ambiente | Onde roda a API | Banco | Auth | Open Finance | Deploy |
|---|---|---|---|---|---|
| `development` | Local (`nest start --watch`) ou `vercel dev` | Supabase projeto **dev/staging** (schema compartilhado) OU Postgres local via Docker | Supabase Auth (projeto dev/staging) | Pluggy Sandbox | Manual, na máquina do dev |
| `staging` | Vercel **Preview** (1 deployment por PR aberto) | Supabase projeto **staging** (2º projeto Free) | Supabase Auth (projeto staging) | Pluggy Sandbox | Automático a cada push em PR |
| `production` | Vercel **Production** (branch `main`) | Supabase projeto **production** (1º projeto Free) | Supabase Auth (projeto production) | Pluggy Produção | Automático no merge em `main` |

**Suposição desta spec:** `development` local usa o **mesmo projeto Supabase de staging** (não um 3º projeto, já que o plano Free do Supabase cobre 2 projetos ativos por organização — decisão já tomada em `00-DECISIONS.md` §7). Para evitar que desenvolvedores rodando local corrompam dados de staging usados em testes de PR, cada desenvolvedor usa seu **próprio schema Postgres** dentro do mesmo projeto Supabase de staging (`search_path` customizado, ex. `dev_wictor`), aplicado via `DATABASE_URL` com parâmetro `schema=`. Alternativa aceitável documentada: Postgres local via Docker Compose para quem preferir isolamento total; ambas as opções devem funcionar com o mesmo `schema.prisma`.

## 2. Variáveis de ambiente por ambiente

Nenhum valor real é listado aqui — apenas nomes e propósito. Valores reais vivem em GitHub Actions Secrets, Vercel Environment Variables ou EAS Secrets (ver [secrets-management.md](./secrets-management.md)).

**Backend (NestJS na Vercel), comuns aos 3 ambientes:**

```text
NODE_ENV                        # development | staging | production
DATABASE_URL                    # connection string Prisma (pooled, via Supabase pgbouncer)
DIRECT_URL                      # connection string direta (para `prisma migrate`)
SUPABASE_URL
SUPABASE_JWKS_URL                # validação de JWT (resource server, sem chave privada)
SUPABASE_SERVICE_ROLE_KEY        # somente para operações admin server-side (nunca no client)
PLUGGY_CLIENT_ID
PLUGGY_CLIENT_SECRET
PLUGGY_WEBHOOK_SECRET
SENTRY_DSN_BACKEND
LOG_LEVEL                        # debug (dev) | info (staging) | warn (production)
CORS_ALLOWED_ORIGINS             # lista explícita, nunca "*"
GRAPHQL_INTROSPECTION_ENABLED    # true (dev/staging) | false (production)
```

**Mobile (Expo/EAS), via `eas.json` + variáveis de ambiente por profile:**

```text
EXPO_PUBLIC_API_URL              # aponta para Vercel preview/staging/production conforme o build profile
EXPO_PUBLIC_SENTRY_DSN_MOBILE
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY    # chave pública, segura para embutir no app
SSL_PIN_PRIMARY                  # hash do pin público atual do backend
SSL_PIN_BACKUP                   # hash do pin de emergência
```

Nenhuma variável com prefixo `EXPO_PUBLIC_` deve conter segredo — esse prefixo é embutido no bundle JS e é público por definição. `SUPABASE_SERVICE_ROLE_KEY` e `PLUGGY_CLIENT_SECRET` **nunca** têm equivalente `EXPO_PUBLIC_*`.

## 3. Prisma Migrate por ambiente

- **development:** `prisma migrate dev` — cria migração local, aplica no schema pessoal do desenvolvedor, gera o client. Migrações são commitadas em `prisma/migrations/`.
- **staging:** aplicado automaticamente pelo workflow de CD, rodando `prisma migrate deploy` (nunca `migrate dev`) contra o projeto Supabase de staging, **antes** do deploy da função Vercel que consumirá o novo schema.
- **production:** mesmo comando (`prisma migrate deploy`), disparado pelo workflow de CD **apenas no merge em `main`**, com um gate manual de aprovação (GitHub Environment `production` com *required reviewer*) antes de rodar contra o banco de produção.
- Staging e produção usam Postgres de projetos Supabase **fisicamente distintos** — não há branch de banco automática dentro do mesmo projeto (recurso pago do Supabase). Manter o schema de staging sincronizado com produção é responsabilidade do pipeline: como toda migração que vai para `main` passou antes por staging (fluxo normal de PR → preview → merge), staging está sempre no schema mais recente ou à frente da produção, nunca atrasado.
- Rollback de migração: não há downgrade automático do Prisma. Política: toda migração destrutiva (`DROP COLUMN`, `DROP TABLE`, alteração de tipo com perda de dado) deve ser dividida em duas migrações (expand/contract) para permitir rollback do deploy da aplicação sem rollback do banco.
