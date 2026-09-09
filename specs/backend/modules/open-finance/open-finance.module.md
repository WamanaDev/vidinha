# Módulo `open-finance` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.4`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
enum ConnectionStatus {
  CONNECTING
  UPDATED
  UPDATING
  LOGIN_ERROR
  OUTDATED
  REVOKED
}

type OpenFinanceConnection implements Node {
  id: ID!
  institutionName: String!
  institutionLogoUrl: String
  status: ConnectionStatus!
  lastSyncedAt: DateTime
  createdAt: DateTime!
  accounts: [Account!]!
}

type PluggyConnectToken {
  connectToken: String!
  expiresAt: DateTime!
}

input CreateOpenFinanceConnectionInput {
  itemId: String! # gerado pelo Pluggy Connect no client após o usuário concluir o fluxo
}

type Query {
  openFinanceConnections(familyId: ID!): [OpenFinanceConnection!]!
  pluggyConnectToken: PluggyConnectToken! # token de curta duração p/ inicializar o widget Pluggy Connect
}

type Mutation {
  createOpenFinanceConnection(
    input: CreateOpenFinanceConnectionInput!
  ): OpenFinanceConnection!
  syncOpenFinanceConnection(connectionId: ID!): OpenFinanceConnection!
  revokeOpenFinanceConnection(connectionId: ID!): Boolean!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §2`)

- **Provedor:** **Pluggy** (agregador brasileiro, Open Finance + bancos tradicionais, sandbox gratuito).
- Integração via **Pluggy Connect** (widget/SDK) do lado do app; o backend NestJS consome a API do Pluggy para buscar contas, cartões e transações **após** o `itemId` ser criado no client — o backend nunca vê credenciais bancárias do usuário.
- Dados importados no MVP: contas, saldos, cartões (limite/fatura, sem PAN completo), transações (últimos 12 meses conforme disponibilidade do provedor).
- **Sincronização:** webhook do Pluggy (`item/updated`) + fallback de sync manual (mutation `syncOpenFinanceConnection`, usada em pull-to-refresh) + job diário de reconciliação (fora do escopo deste módulo GraphQL — job agendado separado).
- **Consentimento:** fluxo do próprio Pluggy Connect (tela nativa do provedor).
- **Revogação:** `revokeOpenFinanceConnection` dispara `DELETE /items/{id}` no Pluggy e marca a conexão como `REVOKED` (soft-delete, mantém histórico de transações já importadas conforme política de retenção). Evento obrigatoriamente auditado (`00-DECISIONS.md §9`).
- **PCI-DSS:** como o Vidinha nunca recebe PAN completo, CVV ou dados brutos de tarifa (apenas dados agregados via Pluggy), o escopo de PCI-DSS é tratado como **fora do perímetro direto do Vidinha**; a obrigação de conformidade recai sobre o Pluggy e as instituições financeiras. Validar contratualmente com o Pluggy antes de produção.
- **Isolamento da API key do Pluggy (PoLP):** toda chamada HTTP ao Pluggy deve passar por um `pluggy-client.service.ts` dedicado (separado do `open-finance.service.ts`), isolando a superfície de chamada externa e mantendo a API key confinada a um único ponto (`04-SECURITY-COMPLIANCE §6`) — facilita mock em teste.
- **Rate limiting:** `syncOpenFinanceConnection` usa o named throttler `openfinance-sync` (6/min), respeitando o rate limit do Pluggy — ver [`../../common/rate-limiting.md`](../../common/rate-limiting.md).
- **Webhook do Pluggy:** implementado como function serverless separada (`api/webhooks/pluggy.ts`), fora do `JwtAuthGuard` global. **Autenticação confirmada** (não é suposição): o Pluggy não assina o payload (sem HMAC); a autenticidade é garantida por um **header HTTP customizado** (`X-Vidinha-Webhook-Secret`) definido por nós ao cadastrar o webhook via `POST /webhooks` na API do Pluggy (não é possível pelo Dashboard) — o Pluggy ecoa esse header em toda notificação subsequente. Payload real: `{ event: "item/created"|"item/updated"|"item/error", eventId, itemId, triggeredBy, clientUserId, error? }`; resposta exigida em até 5s. Defesa adicional opcional: IP de origem fixo do Pluggy (`52.67.145.81`) para allowlist na borda.
- **Autorização:** `openFinanceConnections(familyId)` só retorna conexões visíveis ao usuário dentro daquela família (dono, ou compartilhadas via `sharing-permissions` — ver [`../sharing-permissions/sharing-permissions.module.md`](../sharing-permissions/sharing-permissions.module.md)); revogar uma conexão só é permitido pelo dono (checagem de posse no service, nunca no DTO, conforme convenção 2.3 de `../../00-overview.md`).

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/open-finance/
├── open-finance.module.ts
├── open-finance.resolver.ts
├── open-finance.service.ts
├── open-finance.service.spec.ts
├── pluggy-client.service.ts        # cliente HTTP dedicado à API do Pluggy (isola a API key)
├── dto/
│   └── create-open-finance-connection.input.ts
└── entities/
    ├── open-finance-connection.entity.ts
    └── pluggy-connect-token.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md).
