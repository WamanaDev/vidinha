# Módulo `accounts` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.5`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
# Enum real do schema Prisma (fonte de verdade) — o rascunho original deste
# contrato listava CHECKING/SAVINGS/CREDIT_CARD_WALLET, que nunca existiu no
# schema Prisma; CASH ("Carteira") e CRYPTO ("Carteira digital") foram
# adicionados para suportar contas 100% manuais (sem Open Finance).
enum AccountType {
  CHECKING
  SAVINGS
  INVESTMENT
  CASH
  CRYPTO
  OTHER
}

type Account implements Node {
  id: ID!
  name: String!
  type: AccountType!
  balance: Float!
  currency: String!
  connection: OpenFinanceConnection
  sharedWithFamily: Boolean!
  fullDetailShared: Boolean! # ver o extrato transação-a-transação
  owner: User!
}

input UpdateAccountSharingInput {
  accountId: ID!
  sharedWithFamily: Boolean!
  fullDetailShared: Boolean!
}

# Cadastro manual de conta (sem Open Finance) — sempre cria com
# `isManual: true`, `connectionId: null`. `familyId` só é usado para checar
# que o chamador é membro ativo da família (a conta pertence ao usuário via
# `ownerId`, não à família).
input CreateAccountInput {
  familyId: ID!
  name: String!
  type: AccountType!
  maskedNumber: String
  balance: Float! # saldo inicial
  currency: String # default "BRL"
}

# Edição de conta manual. Só permitido quando `isManual: true` e o chamador
# é o dono (checado no service). `type` não é editável após a criação.
input UpdateAccountInput {
  id: ID!
  name: String
  maskedNumber: String
  currency: String
  balance: Float # permite corrigir o saldo manualmente
}

type Query {
  accounts(familyId: ID!): [Account!]!
}

type Mutation {
  updateAccountSharing(input: UpdateAccountSharingInput!): Account!
  createAccount(input: CreateAccountInput!): Account!
  updateAccount(input: UpdateAccountInput!): Account!
  archiveAccount(id: ID!): Boolean! # soft-delete (archivedAt), manual ou sincronizada, só dono
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1`)

- **Conta compartilhada** = uma conta que o dono explicitamente marcou como visível para a família. Compartilhamento é **sempre opt-in, nunca automático** — `sharedWithFamily` começa `false` para toda conta nova (inclusive as importadas via Open Finance).
- Granularidade do compartilhamento é **por conta** (não há compartilhamento "tudo ou nada" da carteira financeira inteira).
- Visão do outro integrante: por padrão, **valores consolidados** (totais por categoria/mês); ver o extrato transação-a-transação de uma conta exige que o dono tenha habilitado `fullDetailShared` para aquela conta especificamente — `sharedWithFamily: true` sozinho não libera o detalhe.
- `updateAccountSharing` só pode ser executada pelo **dono** da conta (`owner`) — checagem de posse no service (nunca no DTO), consistente com a convenção 2.3 de [`../../00-overview.md`](../../00-overview.md).
- Autorização de leitura (`accounts(familyId)`): o dono sempre vê suas próprias contas; os demais membros da família só veem contas com `sharedWithFamily: true` — reaproveitar a mesma lógica de ABAC do `AbilityFactory` documentada para `Transaction` em [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md), adaptada ao subject `Account`.
- Contas vêm de duas origens possíveis: importadas via Open Finance (`connection` preenchido, ver [`../open-finance/open-finance.module.md`](../open-finance/open-finance.module.md)) ou cadastradas manualmente (`isManual: true`, `connectionId: null`) — ver [`../../00-overview.md`](../../00-overview.md).
- Alteração de `sharedWithFamily`/`fullDetailShared` é evento auditável (mudança em dados compartilhados, conforme `00-DECISIONS.md §9`) — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).
- **CRUD manual** (`createAccount`/`updateAccount`/`archiveAccount`): permite cadastrar contas 100% manuais, incluindo "Carteira" (`AccountType.CASH`) e "Carteira digital" (`AccountType.CRYPTO`), além de qualquer outro tipo. `createAccount` sempre cria com `isManual: true`, `connectionId: null`, e a conta nasce privada (sem `SharingPermission`) — compartilhamento continua sendo sempre um passo manual posterior via `updateAccountSharing`. `updateAccount` só funciona em contas com `isManual: true` — uma conta sincronizada via Open Finance é somente leitura para edição de dados (exceto compartilhamento), pois seus dados vêm da instituição financeira real. **`archiveAccount`, ao contrário de `updateAccount`, é permitido para qualquer conta (manual OU sincronizada)** — o usuário pode querer "excluir"/esconder uma conta específica trazida por uma instituição sem precisar desconectar a instituição inteira (`revokeOpenFinanceConnection`), que poderia trazer outras contas que ele quer manter. `archiveAccount` faz soft-delete via `archivedAt`; contas arquivadas somem de `accounts(familyId)` mas preservam o histórico de transações, e um resync futuro da mesma instituição não reverte o arquivamento (o upsert de sincronização nunca escreve `archivedAt`). Só o dono pode executar qualquer uma dessas mutations. Eventos `ACCOUNT_CREATED`/`ACCOUNT_UPDATED`/`ACCOUNT_ARCHIVED` são auditados (ver `audit-log.module.md`), sem incluir o valor do saldo no metadata.

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/accounts/
├── accounts.module.ts
├── accounts.resolver.ts
├── accounts.service.ts
├── accounts.service.spec.ts
├── dto/
│   └── update-account-sharing.input.ts
└── entities/
    └── account.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). Este módulo depende de `sharing-permissions` (visibilidade cross-usuário) e `open-finance` (fonte de dados) — ver ordem de implementação em [`../../00-overview.md §3`](../../00-overview.md).
