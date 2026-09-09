# Checklist OWASP ASVS aplicado ao Vidinha (backend NestJS)

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

Nível de referência: **ASVS Nível 2** (aplicação que trata dados financeiros/pessoais). Prioridade `MVP` = obrigatório para o lançamento; `Pós-MVP` = evoluir depois, sem bloquear o lançamento.

## 1. Autenticação (ASVS V2 / V6)

| # | Requisito concreto | Prioridade |
|---|---|---|
| A1 | Backend NUNCA emite ou valida senha diretamente — autenticação é delegada 100% ao Supabase Auth (email/senha, Google, Apple). | MVP |
| A2 | Todo resolver GraphQL protegido valida o JWT do Supabase via **JWKS** (`jwks-rsa` + `passport-jwt` ou guard customizado), verificando `iss`, `aud`, `exp` e assinatura a cada request — nunca confiar em cache de validade além do TTL do JWKS. | MVP |
| A3 | Guard global (`APP_GUARD`) nega por padrão (`fail secure`); rotas/resolvers públicos exigem decorator explícito `@Public()`. | MVP |
| A4 | MFA (TOTP via Supabase) verificável no backend via claim `aal` (Authentication Assurance Level) do JWT — operações sensíveis (ex.: alterar permissão de compartilhamento, excluir família) podem exigir `aal2` quando o usuário tiver MFA ativado. | Pós-MVP |
| A5 | Rate limiting específico em fluxos de auth (mesmo delegado ao Supabase, aplicar throttle no gateway NestJS para endpoints que fazem lookup por usuário, ex. convite por e-mail) para mitigar enumeração de contas. | MVP |

## 2. Controle de acesso (ASVS V4)

| # | Requisito concreto | Prioridade |
|---|---|---|
| C1 | Toda entidade sensível (`Account`, `Card`, `Transaction`, `Category`, `SharingPermission`) carrega `familyId`/`ownerId`; todo resolver revalida posse/pertencimento no código — **nunca confiar apenas em RLS do Supabase** (conforme decisão de defesa em profundidade). | MVP |
| C2 | Autorização com **CASL**: `AbilityFactory` por request, construindo regras a partir de `userId`, `familyId(s)` do usuário e papel (`ADMIN`/`MEMBER`), avaliada em cada resolver via `@CheckAbility()`. | MVP |
| C3 | Nenhum resolver aceita `familyId`/`accountId` do input do cliente como fonte de verdade para autorização sem revalidar contra o que o usuário efetivamente possui/pertence (evita IDOR). | MVP |
| C4 | Regra de visibilidade "detalhe completo vs. consolidado" e `hiddenFromFamily` aplicadas na camada de resolver/service, nunca apenas no client (o app não deve ser o único lugar que filtra transações ocultas). | MVP |
| C5 | Testes automatizados de autorização (CASL) cobrindo os casos negativos: membro tentando ver conta não compartilhada, membro tentando promover papel, usuário de família A acessando dado de família B. | MVP |

## 3. Validação de entrada (ASVS V5)

| # | Requisito concreto | Prioridade |
|---|---|---|
| V1 | Todo Input GraphQL é uma classe `class-validator`, validada via `ValidationPipe` global (`whitelist: true, forbidNonWhitelisted: true, transform: true`). | MVP |
| V2 | Prisma como única camada de acesso a dados — nenhuma query SQL raw concatenando string; se `$queryRaw` for necessário, usar apenas com `Prisma.sql` parametrizado. | MVP |
| V3 | Limites de tamanho/paginação obrigatórios em toda query de lista (`take` máximo 100, `cursor`-based pagination) para evitar exaustão de recursos. | MVP |
| V4 | Sanitização de campos de texto livre (nome de categoria, descrição de transação) contra payloads de script antes de persistir — mitigação de XSS armazenado, relevante caso haja client web futuro. | MVP |

Exemplos completos de DTOs com `class-validator` estão em [input-validation.md](./input-validation.md).

## 4. Criptografia (ASVS V6/V9)

| # | Requisito concreto | Prioridade |
|---|---|---|
| K1 | TLS obrigatório ponta a ponta (Vercel Edge → NestJS; NestJS → Supabase; NestJS → Pluggy). Nenhuma chamada HTTP não criptografada, inclusive em jobs internos. | MVP |
| K2 | Segredos de terceiros (Pluggy API key, Supabase service role key) nunca em código-fonte; apenas via variáveis de ambiente do provedor (Vercel Environment Variables), ver [secrets.md](./secrets.md). | MVP |
| K3 | Dados financeiros armazenados como recebidos do Pluggy (já agregados, sem PAN/CVV) — nenhuma criptografia adicional de campo é estritamente necessária para PCI-DSS (fora do perímetro, ver 00-DECISIONS §2), mas campos de e-mail/telefone de convite pendente devem ser tratados como PII e não logados em texto claro. | MVP |
| K4 | Hash de qualquer identificador exposto publicamente (ex.: token de convite de família) via `crypto.randomBytes` + hash antes de persistir, nunca reversível. | MVP |

## 5. Sessões (ASVS V3)

| # | Requisito concreto | Prioridade |
|---|---|---|
| S1 | Backend é stateless em relação à sessão (JWT do Supabase); nenhuma sessão própria em memória/DB do NestJS. | MVP |
| S2 | Logout global (`signOut({ scope: 'global' })`) deve ser exposto como mutation (`logoutAllDevices`) que delega ao Supabase Admin API. | MVP |
| S3 | Revogação de MFA/sessão ao detectar troca de senha ou remoção de MFA — delegado ao Supabase, backend apenas reflete o estado (`aal`) no próximo request. | Pós-MVP |

## 6. API/GraphQL (ASVS V13/V14)

| # | Requisito concreto | Prioridade |
|---|---|---|
| G1 | **Query depth limit** e **complexity limit** (`graphql-query-complexity` ou `graphql-depth-limit`) para mitigar DoS via queries aninhadas. | MVP |
| G2 | Desabilitar **introspection** e **GraphQL Playground/Sandbox** em produção (`NODE_ENV=production` → `introspection: false, playground: false`). | MVP |
| G3 | Rate limiting global via `@nestjs/throttler` (memória no MVP, Upstash Redis quando escalar — conforme 00-DECISIONS §7). | MVP |
| G4 | CORS restritivo: `origin` explícito (domínio do app/web futuro), nunca `*` em produção. | MVP |
| G5 | Versionamento de schema: nenhum campo removido sem depreciação (`@deprecated`) por ao menos 1 ciclo de release; CI falha em breaking change não intencional (conforme 00-DECISIONS §8 — snapshot do SDL). | MVP |

## 7. Configuração (ASVS V14) e Logging (ASVS V7)

| # | Requisito concreto | Prioridade |
|---|---|---|
| F1 | `helmet` habilitado no NestJS (mesmo sendo API GraphQL, protege contra sniffing/clickjacking em qualquer endpoint REST auxiliar, ex. webhook do Pluggy). | MVP |
| F2 | Erros de produção nunca retornam stack trace/SQL/paths internos ao cliente (ver exception filter em [error-handling.md](./error-handling.md)). | MVP |
| F3 | Logs estruturados via `nestjs-pino`, com máscara de PII (e-mail parcial, sem CPF completo, nunca token/JWT/segredo em log) — conforme 00-DECISIONS §9. | MVP |
| F4 | Auditoria: tabela `AuditLog` populada via interceptor dedicado para os eventos definidos em 00-DECISIONS §9 (login, logout, criação/exclusão de família, mudança de papel, conexão/revogação Open Finance, mudança de permissão de compartilhamento, exclusão de conta), retenção mínima 12 meses. | MVP |
