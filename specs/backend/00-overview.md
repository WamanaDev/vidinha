# Vidinha — Backend NestJS: Visão Geral (v1)

**Status:** Reestruturação de `specs/02-API-AUTH.md` e `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md` (conteúdo original preservado integralmente, apenas reorganizado por domínio/responsabilidade).

**Pré-requisitos lidos e respeitados como fonte da verdade — nenhuma decisão contrariada:**
- `CLAUDE.md` §§10-11 (backend/GraphQL), §13 (arquitetura por feature), §14 (separação de responsabilidades), §15 (path aliases), §28 (validação de dados), §29 (menor privilégio), §31 (tratamento de erros).
- `specs/00-DECISIONS.md` (Supabase Auth+JWKS, RBAC+CASL, Vercel Serverless, Prisma/Postgres, Pluggy, custo zero).
- `specs/01-DATA-MODEL.md` (schema Prisma — nomes exatos de models/enums/campos usados aqui).
- `specs/04-SECURITY-COMPLIANCE.md` (exemplos de `class-validator` e exception filter reaproveitados e expandidos).

Este documento (e os arquivos linkados abaixo) são escritos para que **outro agente de código implemente o backend inteiro sem adivinhar estrutura, nomes ou padrões**. Onde uma decisão não estava coberta pelos documentos acima, ela foi assumida da forma mais simples/conservadora e sinalizada como suposição — nada aqui contradiz as specs anteriores.

`specs/02-API-AUTH.md` e `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md` foram substituídos por stubs curtos apontando para esta árvore. Nenhuma informação técnica foi perdida no processo — apenas reorganizada por domínio, com os módulos que ainda não tinham código de exemplo (todos exceto `family`) recebendo o contrato GraphQL completo + regras de negócio + nota de padrão a seguir.

---

## Índice

### Common (transversal a todos os módulos)

- [`common/jwt-auth-guard.md`](./common/jwt-auth-guard.md) — validação JWT/JWKS do Supabase (estratégia Passport, `JwtAuthGuard` global, `@Public()`).
- [`common/casl-ability-factory.md`](./common/casl-ability-factory.md) — `AbilityFactory` (RBAC + ABAC), `PoliciesGuard`, `@CheckAbility()`, step-up `aal2`.
- [`common/exception-filter.md`](./common/exception-filter.md) — `GraphQLExceptionFilter`, `ErrorCode`, formato padronizado de erro.
- [`common/rate-limiting.md`](./common/rate-limiting.md) — `@nestjs/throttler` (named throttlers) e política de CORS.
- [`common/vercel-serverless-handler.md`](./common/vercel-serverless-handler.md) — `main.ts`, `api/graphql.ts`, `PrismaService`/connection pooling serverless, cold start.

### Módulo `family` (exemplo completo de código, referência de padrão para os demais)

- [`modules/family/family.module.md`](./modules/family/family.module.md) — visão geral do módulo, entidades, `family.module.ts`.
- [`modules/family/create-family.md`](./modules/family/create-family.md) — `createFamily` (resolver + service + dto + regras).
- [`modules/family/invite-member.md`](./modules/family/invite-member.md) — `inviteMember` (resolver + service + dto + regras).
- [`modules/family/remove-member.md`](./modules/family/remove-member.md) — `removeMember` (resolver + service + dto + regra do último admin + teste unitário).
- [`modules/family/promote-admin.md`](./modules/family/promote-admin.md) — `promoteMember` (resolver + service + dto + regras).

### Demais módulos (contrato GraphQL completo; código ainda por escrever seguindo o padrão de `family`)

- [`modules/open-finance/open-finance.module.md`](./modules/open-finance/open-finance.module.md)
- [`modules/accounts/accounts.module.md`](./modules/accounts/accounts.module.md)
- [`modules/cards/cards.module.md`](./modules/cards/cards.module.md)
- [`modules/transactions/transactions.module.md`](./modules/transactions/transactions.module.md)
- [`modules/sharing-permissions/sharing-permissions.module.md`](./modules/sharing-permissions/sharing-permissions.module.md)
- [`modules/recurring-expenses/recurring-expenses.module.md`](./modules/recurring-expenses/recurring-expenses.module.md)
- [`modules/categories/categories.module.md`](./modules/categories/categories.module.md)
- [`modules/audit-log/audit-log.module.md`](./modules/audit-log/audit-log.module.md)

---

## 1. Estrutura de pastas completa do projeto NestJS

Organização **por feature/domínio** (conforme `CLAUDE.md §13`), compatível com deploy como Vercel Serverless Function (handler único em `api/graphql.ts` reaproveitando a instância Nest — ver `common/vercel-serverless-handler.md`).

**Nota de monorepo (`00-DECISIONS.md §11`, `specs/infra/git-workflow.md §1`):** toda a árvore abaixo é relativa a `apps/api/` dentro do monorepo `vidinha/` (não à raiz do repositório). `apps/api/tsconfig.json` estende `packages/config/tsconfig.base.json`; comandos são executados via workspace (`pnpm --filter api <script>` ou `pnpm -C apps/api <script>`), nunca a partir da raiz diretamente.

```text
apps/api/
├── api/
│   └── graphql.ts                     # Entry point da Vercel Serverless Function
├── prisma/
│   ├── schema.prisma                  # Fonte: specs/01-DATA-MODEL.md §2 (copiar literalmente)
│   ├── migrations/
│   └── seed.ts                        # Categorias padrão (ownerId=null) + catálogo inicial de Institution
├── src/
│   ├── main.ts                        # Bootstrap Nest local (dev) + factory reaproveitada pelo handler serverless
│   ├── app.module.ts                  # Módulo raiz: importa ConfigModule, PrismaModule, GraphQLModule, AuthModule, CaslModule, ThrottlerModule, todos os modules de domínio
│   ├── config/
│   │   ├── env.validation.ts          # Schema Zod de validação de variáveis de ambiente
│   │   ├── configuration.ts           # Factory que expõe env tipado ao ConfigModule
│   │   └── graphql.config.ts          # Config do GraphQLModule (autoSchemaFile, formatError, plugins de complexity/depth)
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts            # @Public() — bypass do JwtAuthGuard global
│   │   │   ├── current-user.decorator.ts      # @CurrentUser() — extrai context.user
│   │   │   ├── check-ability.decorator.ts     # @CheckAbility(Action, Subject) — metadata para o PoliciesGuard
│   │   │   └── throttle-named.decorator.ts    # helpers para os named throttlers (ver common/rate-limiting.md)
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts               # Guard global (APP_GUARD), fail-secure, respeita @Public()
│   │   │   ├── policies.guard.ts               # Executa @CheckAbility() usando AbilityFactory
│   │   │   └── gql-throttler.guard.ts          # Adapta @nestjs/throttler ao contexto GraphQL (chave = userId, fallback IP)
│   │   ├── filters/
│   │   │   └── graphql-exception.filter.ts     # GraphQLExceptionFilter global
│   │   ├── interceptors/
│   │   │   ├── audit-log.interceptor.ts        # Popula AuditLog para mutations decoradas com @Audit(AuditAction)
│   │   │   └── logging.interceptor.ts          # nestjs-pino: log estruturado por operação GraphQL
│   │   ├── pipes/
│   │   │   └── (ValidationPipe é global via APP_PIPE, não precisa de arquivo custom — ver app.module.ts)
│   │   ├── errors/
│   │   │   ├── error-codes.enum.ts             # ErrorCode (ver common/exception-filter.md)
│   │   │   └── app.exceptions.ts               # ForbiddenAppException, NotFoundAppException, ConflictAppException etc.
│   │   └── types/
│   │       ├── auth-user.type.ts               # { userId, email, aal }
│   │       └── page-info.type.ts               # PageInfo GraphQL ObjectType (Relay-style)
│   ├── prisma/
│   │   ├── prisma.module.ts            # @Global() module
│   │   └── prisma.service.ts           # PrismaService (singleton por invocação — ver common/vercel-serverless-handler.md)
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   └── supabase-jwt.strategy.ts        # SupabaseJwtStrategy (JWKS via jwks-rsa — ver common/jwt-auth-guard.md)
│   │   ├── auth.resolver.ts            # Query me, Mutation completeUserProfile/requestAccountDeletion/exportMyData/logoutAllDevices
│   │   ├── auth.service.ts             # JIT provisioning do User local, integração Supabase Admin API
│   │   ├── dto/
│   │   │   └── complete-profile.input.ts
│   │   └── entities/
│   │       └── user.entity.ts          # User GraphQL ObjectType
│   ├── casl/
│   │   ├── casl.module.ts
│   │   ├── ability.factory.ts          # AbilityFactory.createForUser (ver common/casl-ability-factory.md)
│   │   └── action.enum.ts              # Action { Manage, Read, Create, Update, Delete }
│   └── modules/
│       ├── family/
│       │   ├── family.module.ts
│       │   ├── family.resolver.ts
│       │   ├── family.service.ts
│       │   ├── family.service.spec.ts
│       │   ├── family.resolver.spec.ts
│       │   ├── dto/
│       │   │   ├── create-family.input.ts
│       │   │   ├── invite-family-member.input.ts
│       │   │   ├── accept-invite.input.ts
│       │   │   ├── remove-member.input.ts
│       │   │   └── promote-member.input.ts
│       │   └── entities/
│       │       ├── family.entity.ts
│       │       ├── family-membership.entity.ts
│       │       ├── family-invite.entity.ts
│       │       └── family-payload.entity.ts
│       ├── open-finance/
│       │   ├── open-finance.module.ts
│       │   ├── open-finance.resolver.ts
│       │   ├── open-finance.service.ts
│       │   ├── open-finance.service.spec.ts
│       │   ├── pluggy-client.service.ts        # Cliente HTTP dedicado à API do Pluggy (isola a chave de API — PoLP)
│       │   ├── dto/
│       │   │   └── create-open-finance-connection.input.ts
│       │   └── entities/
│       │       ├── open-finance-connection.entity.ts
│       │       └── pluggy-connect-token.entity.ts
│       ├── accounts/
│       │   ├── accounts.module.ts
│       │   ├── accounts.resolver.ts
│       │   ├── accounts.service.ts
│       │   ├── accounts.service.spec.ts
│       │   ├── dto/
│       │   │   └── update-account-sharing.input.ts
│       │   └── entities/
│       │       └── account.entity.ts
│       ├── cards/
│       │   ├── cards.module.ts
│       │   ├── cards.resolver.ts
│       │   ├── cards.service.ts
│       │   ├── cards.service.spec.ts
│       │   ├── dto/
│       │   │   └── update-card-sharing.input.ts
│       │   └── entities/
│       │       └── card.entity.ts
│       ├── transactions/
│       │   ├── transactions.module.ts
│       │   ├── transactions.resolver.ts
│       │   ├── transactions.service.ts
│       │   ├── transactions.service.spec.ts
│       │   ├── dto/
│       │   │   ├── transaction-filter.input.ts
│       │   │   ├── transaction-order.input.ts
│       │   │   ├── hide-transaction.input.ts
│       │   │   └── update-transaction-category.input.ts
│       │   └── entities/
│       │       ├── transaction.entity.ts
│       │       ├── transaction-edge.entity.ts
│       │       └── transaction-connection.entity.ts
│       ├── sharing-permissions/
│       │   ├── sharing-permissions.module.ts
│       │   ├── sharing-permissions.resolver.ts
│       │   ├── sharing-permissions.service.ts
│       │   ├── sharing-permissions.service.spec.ts
│       │   ├── dto/
│       │   │   └── update-sharing-permission.input.ts
│       │   └── entities/
│       │       └── sharing-permission.entity.ts
│       ├── recurring-expenses/
│       │   ├── recurring-expenses.module.ts
│       │   ├── recurring-expenses.resolver.ts
│       │   ├── recurring-expenses.service.ts
│       │   ├── recurring-expenses.service.spec.ts
│       │   ├── dto/
│       │   │   ├── create-recurring-expense.input.ts
│       │   │   └── update-recurring-expense.input.ts
│       │   └── entities/
│       │       └── recurring-expense.entity.ts
│       ├── categories/
│       │   ├── categories.module.ts
│       │   ├── categories.resolver.ts
│       │   ├── categories.service.ts
│       │   ├── categories.service.spec.ts
│       │   ├── dto/
│       │   │   ├── create-category.input.ts
│       │   │   └── update-category.input.ts
│       │   └── entities/
│       │       └── category.entity.ts
│       └── audit-log/
│           ├── audit-log.module.ts
│           ├── audit-log.service.ts    # Usado pelo AuditLogInterceptor; sem resolver público no MVP (uso interno)
│           └── audit-log.service.spec.ts
├── test/
│   └── integration/
│       ├── jest-e2e.json
│       └── family.e2e-spec.ts          # Supertest contra o schema real (00-DECISIONS §8)
├── .env.example
├── tsconfig.json                       # estende packages/config/tsconfig.base.json
├── nest-cli.json
├── vercel.json
└── package.json                        # scripts do workspace `api`, executados via `pnpm --filter api <script>`
```

**Fonte única do SDL:** desde `00-DECISIONS.md §11`, o snapshot versionado do schema GraphQL (`schema.graphql`) vive em `packages/graphql-schema/schema.graphql` (fora de `apps/api/`), compartilhado com `apps/mobile` via `packages/graphql-types` (tipos gerados a partir dele). `apps/api` reexporta/consome esse SDL em vez de manter uma cópia própria — ver seção 6 abaixo.

**Notas de estrutura:**

- `src/modules/{feature}/entities/*.entity.ts` contém **sempre** GraphQL `@ObjectType()`s, nunca o model Prisma exportado diretamente (ver seção 2.4).
- `audit-log` não tem `resolver.ts` porque `00-DECISIONS.md §9` não define nenhuma query pública de auditoria no MVP — o módulo existe só para ser consumido pelo `AuditLogInterceptor` (uso interno, PoLP). Se uma tela de auditoria for necessária no futuro, adicionar `audit-log.resolver.ts` com uma query restrita a `ADMIN`.
- `open-finance` inclui `pluggy-client.service.ts` separado do `open-finance.service.ts` para isolar toda a superfície de chamada HTTP externa (facilita mock em teste e mantém a API key do Pluggy confinada a um único ponto, conforme `04-SECURITY-COMPLIANCE §6`).

---

## 2. Convenções de código

### 2.1 Nomenclatura

- **Arquivos:** `kebab-case.tipo.ts` — ex.: `create-family.input.ts`, `family.resolver.ts`, `jwt-auth.guard.ts`, `family.service.spec.ts`.
- **Classes/Interfaces/Enums/Types:** `PascalCase` — ex.: `FamilyService`, `CreateFamilyInput`, `FamilyRole`.
- **Métodos e variáveis:** `camelCase`.
- **Constantes de módulo:** `UPPER_SNAKE_CASE` apenas para valores verdadeiramente constantes (ex.: `MAX_PAGE_SIZE = 100`).
- **GraphQL:** nomes de `type`/`input`/`enum` em `PascalCase`; campos e argumentos em `camelCase` — reutilizar os nomes exatos definidos no SDL de cada módulo, nunca renomear.

### 2.2 Path aliases (`tsconfig.json` de `apps/api`)

**Importante — isto é o alias do app NestJS, não confundir com os aliases do app mobile** (`@components/*`, `@features/*` de `CLAUDE.md §15`, que pertencem ao workspace `apps/mobile`).

`apps/api/tsconfig.json` estende `packages/config/tsconfig.base.json` (compartilhado entre `apps/api` e `apps/mobile`, `00-DECISIONS.md §11`) e sobrescreve apenas os paths específicos do backend:

```jsonc
// apps/api/tsconfig.json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@common/*": ["common/*"],
      "@config/*": ["config/*"],
      "@prisma-module/*": ["prisma/*"],
      "@auth/*": ["auth/*"],
      "@casl/*": ["casl/*"],
      "@modules/*": ["modules/*"]
    }
  }
}
```

Nota: o alias do módulo Prisma é `@prisma-module/*` (não `@prisma/*`) para não colidir com o pacote npm `@prisma/client`, que é importado diretamente (`import { Prisma } from '@prisma/client'`).

### 2.3 Padrão de DTOs de input GraphQL

Todo input é uma classe `@InputType()` decorada com `class-validator`, seguindo exatamente o padrão já estabelecido em `04-SECURITY-COMPLIANCE.md §3`. Regras fixas:

- Um arquivo por input, em `dto/`, nome igual ao da mutation/uso (`create-family.input.ts` → `CreateFamilyInput`).
- Toda validação de **formato** (tamanho, UUID, enum, regex) vive no DTO. Validação de **posse/autorização** (o recurso pertence ao usuário, o `familyId` inclui o usuário) vive no service/CASL — nunca no DTO (regra explícita de `04-SECURITY-COMPLIANCE.md §3`, final).
- `ValidationPipe` global com `whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true` (ver `common/rate-limiting.md`/`common/exception-filter.md` para o restante da config global, e `modules/family/family.module.md` para o `app.module.ts` completo).

### 2.4 Padrão de retorno — nunca o model Prisma diretamente

Toda query/mutation retorna um **GraphQL ObjectType explícito** definido em `entities/*.entity.ts`. O resolver/service nunca faz `return this.prisma.family.findMany(...)` diretamente como resposta — sempre mapeia explicitamente. Exemplo completo em [`modules/family/family.module.md`](./modules/family/family.module.md).

Motivo (reforça `CLAUDE.md §14` — separação UI/regras de negócio/persistência): o model Prisma expõe campos internos (`deletedAt`, chaves estrangeiras cruas) que nunca devem vazar no schema público, e o mapeamento explícito é o ponto único onde uma mudança de schema de banco é isolada da API pública.

### 2.5 Testes

- `*.spec.ts` **ao lado** do arquivo testado (não em pasta `__tests__/` separada) — ex.: `family.service.ts` + `family.service.spec.ts` no mesmo diretório.
- Testes de integração (Supertest contra o schema GraphQL real, `00-DECISIONS.md §8`) ficam em `test/integration/`, fora de `src/`, por rodarem contra um banco de teste real (não fazem parte do build de produção).
- Nomenclatura de describe/it em português ou inglês é livre, mas consistente por arquivo — os exemplos usam português (alinhado às mensagens de erro voltadas ao usuário final, que são em português conforme `common/exception-filter.md`).

---

## 3. Ordem recomendada de implementação dos módulos

| # | Passo | Justificativa (dependências) |
|---|---|---|
| 1 | **Prisma schema + migrations** (`prisma/schema.prisma` copiado de `01-DATA-MODEL.md §2`, `prisma migrate dev`, seed de `Category`/`Institution`) | Todo o resto depende do client Prisma gerado e das tabelas existirem; nenhum service pode ser escrito sem os tipos do `@prisma/client`. |
| 2 | **`PrismaModule`/`PrismaService`** | Provider global consumido por todos os módulos subsequentes — precisa existir antes de qualquer `*.service.ts`. |
| 3 | **`auth` (JWKS guard + JIT provisioning do `User`)** | Nenhum resolver pode ser testado/exercitado sem um usuário autenticado válido; `AbilityFactory` (passo 4) depende de `req.user` já populado pelo guard. Ver `common/jwt-auth-guard.md`. |
| 4 | **`casl` (`AbilityFactory`) + guards globais (`JwtAuthGuard`, `PoliciesGuard`, `GraphQLExceptionFilter`, `ValidationPipe`)** | Autorização e tratamento de erro são transversais a todos os módulos de domínio; implementá-los antes evita retrabalho de "adicionar guard depois" em cada resolver já escrito. Ver `common/casl-ability-factory.md` e `common/exception-filter.md`. |
| 5 | **`family`** | Primeiro módulo de domínio porque `familyId` é pré-requisito de autorização (RBAC) para praticamente todos os demais módulos (compartilhamento, despesas recorrentes, etc.) — sem `Family`/`FamilyMember`, a `AbilityFactory` não tem o que consultar. Ver `modules/family/`. |
| 6 | **`sharing-permissions`** | Depende de `Family` existir (passo 5) e é pré-requisito para que `accounts`/`cards`/`transactions` (passo 8) saibam decidir visibilidade cross-usuário — implementar antes evita escrever consultas de `transactions` sem a peça central da regra de negócio "consolidado vs. detalhe completo". |
| 7 | **`open-finance` (Pluggy)** | Fonte de dados para `Account`/`Card`/`Transaction` reais (Open Finance); implementar o fluxo de conexão (`createOpenFinanceConnection`, sync) antes dos módulos que leem esses dados evita popular `accounts`/`cards`/`transactions` só com dados manuais/mock durante o desenvolvimento. |
| 8 | **`accounts` / `cards` / `transactions`** | Dependem de `open-finance` (passo 7, para dados reais) e `sharing-permissions` (passo 6, para filtrar visibilidade); são o núcleo de valor do produto, implementados juntos porque compartilham a mesma regra de "dono vs. compartilhado" e o mesmo `hiddenFromFamily`. |
| 9 | **`recurring-expenses` / `categories`** | Dependem de `Family` (passo 5) e `Category` já ter seed (passo 1); são funcionalidades complementares (compromissos manuais, taxonomia) que não bloqueiam nem são bloqueadas pelo fluxo de Open Finance, por isso vêm depois do núcleo. |
| 10 | **`audit-log`** | Tecnicamente pode ser implementado mais cedo (nenhuma dependência de dados), mas é colocado aqui porque o `AuditLogInterceptor` precisa que as mutations de todos os módulos anteriores já existam para saber quais eventos de fato disparar (`FAMILY_CREATED`, `SHARING_PERMISSION_UPDATED`, `OPEN_FINANCE_REVOKED` etc.) — implementar por último evita reescrever o mapeamento de eventos a cada novo módulo adicionado. |
| 11 | **Testes de integração (Supertest + schema real) e snapshot do SDL (`schema.graphql`)** | Só fazem sentido cobrindo o schema GraphQL completo e estável; rodar antes disso geraria retrabalho constante de atualizar os testes a cada novo type/mutation adicionado nos passos 5-10. |

---

## 4. Escalares e tipos GraphQL comuns

Compartilhados por todos os módulos (definidos uma vez em `src/common/types/`):

```graphql
scalar DateTime
scalar Cursor
scalar JSON

interface Node {
  id: ID!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: Cursor
  endCursor: Cursor
}

enum OrderDirection {
  ASC
  DESC
}
```

Convenções de schema: paginação **cursor-based estilo Relay** (`edges`/`node`/`pageInfo`) para todas as listagens; filtros e ordenação via input types dedicados; todas as mutations retornam um payload tipado (nunca o tipo bruto isolado), permitindo evolução futura sem breaking change.

## 5. Auth / User (schema base, sem módulo de domínio dedicado)

Login, cadastro, refresh e MFA não possuem mutations no schema do NestJS — ocorrem diretamente via Supabase SDK no app (ver `common/jwt-auth-guard.md` para o fluxo completo de autenticação). O NestJS expõe apenas o perfil local:

```graphql
type User implements Node {
  id: ID!
  email: String!
  displayName: String
  avatarUrl: String
  mfaEnabled: Boolean!
  createdAt: DateTime!
  families: [FamilyMembership!]!
}

input CompleteProfileInput {
  displayName: String!
  avatarUrl: String
}

type Query {
  me: User!
}

type Mutation {
  completeUserProfile(input: CompleteProfileInput!): User!
  requestAccountDeletion: Boolean!
  exportMyData: DataExportPayload!
}

type DataExportPayload {
  downloadUrl: String!
  expiresAt: DateTime!
}
```

`requestAccountDeletion` e `exportMyData` implementam os direitos do titular sob LGPD (`00-DECISIONS.md §10`): exclusão em até 30 dias e exportação de dados em JSON/CSV, respectivamente.

## 6. Versionamento do schema GraphQL

- **Sem versionamento de URL** (`/graphql/v1`, `/graphql/v2`) — GraphQL evolui o schema de forma aditiva e não-destrutiva, seguindo a prática padrão do ecossistema.
- **Regras de evolução:**
  - Novos campos/tipos: sempre opcionais (`nullable`) ou com valor padrão sensato ao serem adicionados a inputs existentes.
  - Remoção de campo: **nunca direta**. Marcar com `@deprecated(reason: "Use X em vez disso. Remoção planejada para vX.")`, manter por no mínimo 2 ciclos de release do app mobile (considerando que apps antigos continuam em uso até o usuário atualizar), só então remover.
  - Mudança de tipo de um campo existente (ex.: `String` → `ID`) é tratada como *breaking change* e exige um novo campo com nome diferente, nunca alterar o campo in-place.
  - Enums: adicionar novos valores é seguro; remover valor existente é breaking change — igual tratamento de deprecação.
- **Snapshot do SDL em CI:** o schema completo é exportado e versionado em `packages/graphql-schema/schema.graphql` — fonte única do contrato, consumida tanto por `apps/api` quanto pelos tipos gerados de `packages/graphql-types` para `apps/mobile` (`00-DECISIONS.md §11`; snapshot em si já previsto em `00-DECISIONS.md`, seção 8 — Testes/Contrato). Pipeline de CI (GitHub Actions):
  1. Gera o SDL atual a partir do código de `apps/api` (`nest build` + introspecção ou `@nestjs/graphql` com `autoSchemaFile`).
  2. Compara com o `packages/graphql-schema/schema.graphql` commitado usando uma ferramenta de *schema diff* (ex.: `graphql-inspector diff`).
  3. Se houver *breaking change* não anotado como intencional (ex.: remoção de campo sem depreciação prévia, mudança de tipo), o build falha.
  4. Se aprovado, o novo `packages/graphql-schema/schema.graphql` é commitado como parte do PR (revisão humana obrigatória de qualquer diff de schema), e `packages/graphql-types` é regenerado a partir dele.
- **Documentação:** descriptions (`"""..."""`) em todos os types/fields relevantes do SDL, servidas automaticamente via introspecção nas ferramentas de client (Apollo Studio/GraphiQL) — cobre o requisito de "documentação completa da API" do item 11 de `CLAUDE.md`.

---

## Suposições desta spec

Pontos não cobertos explicitamente pelos documentos lidos, resolvidos aqui pela opção mais simples/conservadora — nenhuma contradiz decisão já tomada (consolidado de `02-API-AUTH.md` e `06-BACKEND-IMPLEMENTATION-GUIDE.md`):

1. **Confirmação de e-mail obrigatória no cadastro** (`confirm email` habilitado no Supabase) antes do primeiro login — assumido como boa prática padrão de segurança.
2. **Criação do registro `User` local via *just-in-time provisioning*** na primeira requisição autenticada (em vez de webhook `auth.users` do Supabase) — evita depender de webhook adicional no MVP.
3. **Chave de rate limiting por `userId`** quando autenticado (em vez de apenas IP) — ver `common/rate-limiting.md`.
4. **Regra de "não remover o último ADMIN de uma família"** — assumida como salvaguarda de produto, ver `modules/family/remove-member.md`.
5. **Prazo de expiração de convites de família:** assumido 7 dias (`FamilyInvite.expiresAt`).
6. **Painel web administrativo:** CORS já prevê um domínio `admin.vidinha.app` futuro; domínio e existência do painel no MVP não confirmados — tratado como placeholder de configuração.
7. **Nomes de mutations de família:** `inviteMember`/`promoteMember` (nomes do SDL, fonte da verdade) são mantidos como nome de mutation pública; `InviteFamilyMemberInput` é usado apenas como nome de **arquivo/classe DTO** interno, mapeado ao `input` de mutation `InviteMemberInput` do SDL via `@InputType('InviteMemberInput')`.
8. **`@vendia/serverless-express`** foi escolhido como adaptador Express→Lambda/Vercel — se o time preferir `@codegenie/serverless-express` ou o adaptador nativo de `@vercel/node`, a troca é local a `api/graphql.ts`.
9. **Prisma Client padrão + PgBouncer do Supabase (não Accelerate/Data Proxy)** — ver `common/vercel-serverless-handler.md §2` para justificativa de custo zero.
10. **Estrutura de dois `tsconfig` paths** (`@prisma-module/*` em vez de `@prisma/*`) para não colidir com o pacote `@prisma/client`.
11. **Rota HTTP única `/graphql`** e ausência de rotas REST auxiliares (exceto o webhook do Pluggy, `POST /webhooks/pluggy`, implementado como function serverless separada quando o módulo `open-finance` for implementado — não compartilha o `JwtAuthGuard` global, usa segredo compartilhado do Pluggy).
