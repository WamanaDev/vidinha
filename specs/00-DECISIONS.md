# Vidinha — Decisões de Arquitetura e Produto (v1)

**Status:** Decisões tomadas para viabilizar o início das specs e do MVP com **custo zero**.
**Escopo:** Resolve os pontos "A DEFINIR" do `claude.md` original. Pontos jurídicos (LGPD, PCI-DSS) permanecem sinalizados como "requer validação jurídica" mesmo após decisão técnica.

Este documento é a fonte da verdade para todos os outros documentos em `specs/`. Qualquer spec que contradiga este arquivo deve ser corrigida.

---

## 1. Produto — Modelo de Família

- **Decisão:** Família com **2 a N integrantes** (não limitado a casais).
- Existe um papel de **administrador (owner)** — quem cria a família é o primeiro admin.
- Uma família pode ter mais de um admin (promoção por admin existente).
- Um usuário pode participar de **múltiplas famílias** (ex.: sua família e a dos pais), mas cada família tem escopo de dados totalmente isolado.
- Papéis (RBAC): `ADMIN`, `MEMBER`.
  - `ADMIN`: convida/remove membros, gerencia permissões de compartilhamento, exclui a família, vê tudo que foi compartilhado.
  - `MEMBER`: gerencia suas próprias conexões/compartilhamentos, vê o que outros compartilharam com a família.
- **Conta compartilhada** = uma conta/cartão/categoria que o dono explicitamente marcou como visível para a família. Compartilhamento é sempre opt-in, nunca automático.
- Granularidade do compartilhamento: por **conta**, por **cartão** e por **categoria de despesa**. Não há compartilhamento "tudo ou nada".
- Uma transação individual pode ser **ocultada** mesmo dentro de uma conta compartilhada (flag `hiddenFromFamily` por transação).
- Visão do outro integrante: por padrão, **valores consolidados** (totais por categoria/mês); ver o extrato transação-a-transação de uma conta exige que o dono tenha habilitado "detalhe completo" para aquela conta.
- MVP **não inclui** (adiado para v2): divisão automática de despesas, metas financeiras, categorização 100% automática via ML. MVP inclui: categorização manual + sugestão simples por regras (merchant → categoria), notificações básicas (conta a vencer, gasto acima da média), relatório mensal simples por categoria.

## 2. Open Finance

- **Provedor:** **Pluggy** (agregador brasileiro, Open Finance + bancos tradicionais, sandbox gratuito).
- Integração via **Pluggy Connect** (widget/SDK) do lado do app, backend NestJS consome a API do Pluggy para buscar contas, cartões e transações após o `itemId` ser criado.
- Dados importados no MVP: contas, saldos, cartões (limite/fatura, sem PAN completo), transações (últimos 12 meses conforme disponibilidade do provedor).
- Sincronização: **webhook** do Pluggy (`item/updated`) + fallback de sync manual (pull-to-refresh) + job diário de reconciliação.
- Consentimento: fluxo do próprio Pluggy Connect (tela nativa do provedor) — Vidinha nunca vê credenciais bancárias do usuário.
- Revogação: usuário pode desconectar uma instituição a qualquer momento na tela "Conexões"; isso dispara `DELETE /items/{id}` no Pluggy e marca a conexão como `REVOKED` (soft-delete, mantém histórico de transações já importadas conforme política de retenção).
- **PCI-DSS:** como o Vidinha nunca recebe PAN completo, CVV ou dados brutos de tarifa (apenas dados agregados via Pluggy), o escopo de PCI-DSS é tratado como **fora do perímetro direto do Vidinha**; a obrigação de conformidade recai sobre o Pluggy e as instituições financeiras. **Validar contratualmente com o Pluggy** antes de produção.

## 3. Monetização

- **Decisão:** MVP **100% gratuito**, sem cobrança e sem afiliados ativos no lançamento.
- Arquitetura já prevê um módulo `recommendations` desligado por feature flag, para ligar afiliados/parcerias no futuro sem retrabalho estrutural.
- Sem limites artificiais de contas/membros no MVP (o limite real é o rate limit da API do Pluggy no plano gratuito/sandbox).

## 4. Banco de Dados

- **Postgres via Supabase (plano Free)**, acessado pelo backend NestJS através do **Prisma ORM**.
- Motivo: Postgres real (ACID completo), free tier generoso (500MB DB, backups diários apenas no plano pago — ver risco abaixo), inclui Auth e Storage prontos, região `sa-east-1` (São Paulo) disponível, reduzindo latência.
- **Isolamento por família:** toda tabela sensível carrega `familyId`/`ownerId`; nunca usar Postgres RLS do Supabase como única camada — autorização é sempre revalidada no resolver NestJS (defesa em profundidade).
- **Nível de isolamento de transação:** `Read Committed` (padrão Postgres) para leitura geral; `Serializable` apenas nas mutações que alteram saldo/consolidação compartilhada (ex.: aceitar convite de família, mudar permissão de compartilhamento) para evitar condições de corrida.
- **Risco assumido (documentar para o usuário):** Supabase Free não inclui backup automático gerenciado. Mitigação: job agendado (GitHub Actions cron, gratuito) rodando `pg_dump` semanal para armazenamento externo (ex.: Backblaze B2 free tier 10GB ou Cloudflare R2 free tier).

## 5. Autenticação e Autorização

- **Identidade:** **Supabase Auth** (email/senha + Google OAuth + Apple Sign-In — Apple é obrigatório na App Store sempre que há login social).
- Fluxo mobile: Expo `AuthSession` com **PKCE** para os logins sociais; Supabase emite os tokens.
- **JWT:** access token de curta duração (~1h) emitido pelo Supabase; o NestJS atua como *resource server* validando a assinatura via JWKS do Supabase (sem reimplementar emissão de token).
- **Refresh token:** gerenciado pelo Supabase SDK, com rotação automática; armazenado no dispositivo via **Expo SecureStore** (nunca AsyncStorage puro).
- **Revogação/logout:** invalidação de sessão via Supabase (`signOut({ scope: 'global' })` para logout de todos os dispositivos).
- **MFA:** TOTP via Supabase Auth MFA, opcional para todos os usuários no MVP; obrigatório para admins de família é candidato para v2.
- **Autorização (dados):** RBAC (`ADMIN`/`MEMBER`) + regras ABAC via **CASL**, avaliadas nos *resolvers* do GraphQL (ex.: "usuário só acessa transação se pertence a conta própria OU conta compartilhada com sua família E categoria não estiver oculta").

## 6. Segurança Mobile (MASVS)

- **Decisão do usuário: SSL Pinning e ofuscação já entram no MVP** (maior custo de manutenção aceito desde o início).
- SSL Pinning: pinning de chave pública (não de certificado, para sobreviver a renovação de certificado) via biblioteca de config plugin do Expo (ex. `react-native-ssl-public-key-pinning`), o que exige **EAS Build com Dev Client customizado** (não roda no Expo Go).
- Estratégia de rotação: manter **2 pins ativos simultaneamente** (atual + próximo) com no mínimo 60 dias de antecedência antes de trocar o certificado do backend; pin de emergência (*backup pin*) sempre configurado.
- Fallback de falha de pinning: bloquear chamadas de rede com mensagem de erro clara + forçar atualização via **EAS Update**/loja se o pin precisar mudar fora do calendário.
- Ofuscação: Hermes (bytecode, padrão RN/Expo) + ProGuard/R8 habilitado no build Android release; strip de símbolos de debug no iOS. JS bundle minificado pelo Metro em produção.
- Secure Storage: tokens, refresh tokens e qualquer dado sensível **somente** em Expo SecureStore.

## 7. Infraestrutura (custo zero)

| Camada | Escolha | Motivo |
|---|---|---|
| API GraphQL (NestJS) | **Vercel** (Serverless Functions, runtime Node) | Um único ecossistema para API + futura web, deploy automático por push, preview por PR gratuito |
| Banco de dados | **Supabase Postgres (Free)** | Postgres gerenciado, Auth incluso, região BR |
| Autenticação | **Supabase Auth (Free)** | Evita reimplementar auth/MFA/OAuth do zero |
| Mobile build/distribuição | **Expo EAS (Free tier)** | Builds gerenciados, OTA update, dev client custom para SSL pinning |
| Open Finance | **Pluggy (Sandbox/Free)** | Ver seção 2 |
| CI/CD | **GitHub Actions (Free)** | Lint → typecheck → testes → build; dispara EAS Build via CLI |
| Observabilidade/erros | **Sentry (Free tier)** | Error tracking backend + mobile |
| Cache/Rate limit store | Em memória (`@nestjs/throttler`) no MVP; migrar para **Upstash Redis (Free)** quando houver mais de 1 instância | Evita custo até ser necessário |
| Backup externo | **Cloudflare R2 (Free tier, 10GB)** | Guarda dump semanal do Postgres |
| WAF/borda | Proteções padrão da Vercel Edge no MVP; **Cloudflare (Free)** na frente do domínio customizado quando houver domínio próprio | Sem custo adicional |
| Domínio | A definir pelo usuário (não incluso no free tier) | Fora do escopo de "zero custo" — compra pontual |

- **Ambientes:** `development` (local, Postgres via Docker ou branch Supabase), `staging` (Vercel Preview + 2º projeto Supabase Free), `production` (Vercel Production + projeto Supabase principal). O plano Free do Supabase permite 2 projetos ativos por organização, o que cobre staging + produção sem custo.
- **Limitação conhecida:** Vercel Serverless tem *cold start* e limite de duração de função (10s no plano Hobby); GraphQL subscriptions (realtime) **não são suportadas** nesse arranjo — se necessário no futuro, migrar API para Render/Fly.io (ambos com free tier) ou usar Supabase Realtime diretamente.

## 8. Testes

- Unitário: Jest (services, resolvers, guards CASL).
- Integração: Supertest contra o schema GraphQL (queries/mutations reais em banco de teste).
- E2E mobile: **Maestro** (gratuito, mais simples que Detox para Expo).
- Contrato: snapshot do SDL do GraphQL versionado no repo (`schema.graphql`), CI falha se houver *breaking change* não intencional.
- Segurança: `npm audit`/`pnpm audit` + Dependabot (gratuito no GitHub) no CI.

## 9. Observabilidade e Auditoria

- Logs estruturados (JSON) via `nestjs-pino`, sem dados sensíveis (mascarar CPF, e-mail parcial, nunca logar token).
- Sentry captura exceções não tratadas (backend e app).
- **Eventos obrigatoriamente auditados** (tabela `AuditLog`, retenção mínima 12 meses): login, logout, criação/exclusão de família, mudança de papel de membro, conexão/revogação Open Finance, mudança de permissão de compartilhamento, exclusão de conta de usuário.

## 10. LGPD (requer validação jurídica antes de produção)

- Base legal provável: consentimento (Open Finance) + execução de contrato (uso do app) + legítimo interesse (segurança/antifraude).
- Direitos do titular implementados via mutations GraphQL: `exportMyData` (gera JSON/CSV), `requestAccountDeletion` (exclusão em até 30 dias, mantendo apenas o mínimo exigido por obrigação legal, se houver).
- Retenção padrão proposta: dados financeiros mantidos enquanto a conexão estiver ativa; após desconexão/exclusão de conta, anonimização em até 90 dias — **sujeito a revisão jurídica**.

---

## 11. Estrutura de Repositório e Git

- **Decisão:** **monorepo** único (`apps/api`, `apps/mobile`, `packages/graphql-schema`, `packages/graphql-types`, `packages/config`) via **pnpm workspaces**, em vez de repositórios separados para backend e mobile.
- Motivo: backend e app compartilham o contrato GraphQL; um monorepo evita duplicidade/dessincronia entre o SDL e os tipos TypeScript consumidos pelo app.
- **Branching:** GitHub Flow (só `main` como branch de longa duração, branches curtas `feature/*`, `fix/*`, `hotfix/*`, `refactor/*`, `chore/*`, `docs/*`, `test/*`, `ci/*`), squash merge, `main` protegida (sem push direto, sem force push, CI obrigatório).
- **Commits:** Conventional Commits, validados por Husky + commitlint.
- **Versionamento:** SemVer independente por app via **Changesets** (tags `api-vX.Y.Z` e `mobile-vX.Y.Z`), changelog automático por app.
- Detalhamento completo: [`specs/infra/git-workflow.md`](./infra/git-workflow.md).
- **Impacto em specs já escritas:** as estruturas de pasta em `specs/backend/00-overview.md` e `specs/mobile/00-overview.md`, assim como os workflows em `specs/infra/ci-cd-*.md`, foram especificadas antes desta decisão e assumem `apps/api`/`apps/mobile` como raiz. Precisam de um ajuste mecânico de caminho (`working-directory` + `paths:` de trigger) para refletir o monorepo — sem mudança de arquitetura. Ver nota de compatibilidade em `git-workflow.md` seção 1.

## Pontos que continuam explicitamente em aberto

- Domínio e marca registrada (INPI) — depende do resultado do branding.
- Nível de MFA obrigatório para admins (v2).
- Modelo definitivo de afiliados (adiado, sem impacto na arquitetura atual).
- Validação jurídica formal de LGPD/PCI-DSS com profissional especializado.
