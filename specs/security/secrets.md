# Gestão de segredos (Princípio do Menor Privilégio)

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).
> Ver também a estratégia de secrets por workflow de CI/CD em [`../infra/secrets-management.md`](../infra/secrets-management.md).

| Segredo | Onde vive | Quem/o que acessa | Escopo mínimo |
|---|---|---|---|
| Supabase **service role key** | Vercel Environment Variables (produção/staging separados), nunca no client mobile | Apenas o backend NestJS, em operações administrativas específicas (ex.: `logoutAllDevices`, exclusão de conta) | Usar a **anon key** para tudo que não exigir privilégio elevado; isolar chamadas que usam a service role key em um serviço dedicado (`SupabaseAdminService`) para auditar seu uso |
| Supabase **anon key** | Pode ser pública (é o padrão do Supabase), mas ainda assim via env var, não hardcoded | Backend (chamadas normais) | Protegida por RLS + revalidação no NestJS (defesa em profundidade, já coberto em 00-DECISIONS §4) |
| **Pluggy API key/secret** | Vercel Environment Variables (nunca no app mobile — todas as chamadas ao Pluggy passam pelo backend) | Apenas backend NestJS | Rotação periódica (ex.: a cada 90 dias) conforme suportado pelo painel do Pluggy |
| **JWKS do Supabase** (para validar JWT) | Público por natureza (endpoint JWKS), mas cacheado com TTL curto no backend | Guard de autenticação | Nenhuma chave privada de assinatura fica no lado do Vidinha — a emissão do JWT é sempre do Supabase |
| **Sentry DSN** | Env var (build time para mobile via `expo-constants`/EAS secrets; env var para backend) | App mobile (envio de eventos) e backend | DSN não é segredo crítico (é público por design do Sentry), mas ainda assim gerenciado via EAS Secrets/Vercel env, não hardcoded em `app.json` versionado |
| **Chave pública de SSL Pinning** | Config plugin do Expo, versionada no repo (é uma chave pública, não é segredo) | Build mobile | Gerenciada junto ao `eas.json`; processo de rotação documentado em 00-DECISIONS §6 |
| **Cloudflare R2 credentials** (backup) | GitHub Actions Secrets | Apenas o workflow de backup (`pg_dump` semanal) | Permissão restrita a escrita no bucket específico de backup, sem acesso de leitura/exclusão ampla |
| **DATABASE_URL (Postgres)** | Vercel Environment Variables + GitHub Actions Secrets (para o job de backup) | Backend (via Prisma) e job de backup | Usuário de banco do Prisma com permissões mínimas necessárias (evitar usar o usuário `postgres` superuser do Supabase para a aplicação, quando o plano permitir criar role dedicada) |

Princípios aplicados:

- Nenhum segredo em `.env` versionado no Git — apenas `.env.example` com chaves vazias/placeholder.
- Segredos de produção e staging **nunca compartilhados** (dois projetos Supabase separados, conforme 00-DECISIONS §7).
- Cada credencial de terceiro vive apenas onde estritamente necessária (ex.: chave Pluggy nunca chega ao app mobile).
- Revisão de segredos incluída no checklist de CI/CD (ex.: `gitleaks` ou similar no pipeline do GitHub Actions) — **recomendado para MVP**, dado custo zero.
