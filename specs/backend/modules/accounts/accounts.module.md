# Módulo `accounts` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.5`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD_WALLET
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

type Query {
  accounts(familyId: ID!): [Account!]!
}

type Mutation {
  updateAccountSharing(input: UpdateAccountSharingInput!): Account!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1`)

- **Conta compartilhada** = uma conta que o dono explicitamente marcou como visível para a família. Compartilhamento é **sempre opt-in, nunca automático** — `sharedWithFamily` começa `false` para toda conta nova (inclusive as importadas via Open Finance).
- Granularidade do compartilhamento é **por conta** (não há compartilhamento "tudo ou nada" da carteira financeira inteira).
- Visão do outro integrante: por padrão, **valores consolidados** (totais por categoria/mês); ver o extrato transação-a-transação de uma conta exige que o dono tenha habilitado `fullDetailShared` para aquela conta especificamente — `sharedWithFamily: true` sozinho não libera o detalhe.
- `updateAccountSharing` só pode ser executada pelo **dono** da conta (`owner`) — checagem de posse no service (nunca no DTO), consistente com a convenção 2.3 de [`../../00-overview.md`](../../00-overview.md).
- Autorização de leitura (`accounts(familyId)`): o dono sempre vê suas próprias contas; os demais membros da família só veem contas com `sharedWithFamily: true` — reaproveitar a mesma lógica de ABAC do `AbilityFactory` documentada para `Transaction` em [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md), adaptada ao subject `Account`.
- Contas vêm de duas origens possíveis: importadas via Open Finance (`connection` preenchido, ver [`../open-finance/open-finance.module.md`](../open-finance/open-finance.module.md)) ou, potencialmente, cadastradas manualmente no futuro — o campo `connection` é nulável para suportar ambos os casos.
- Alteração de `sharedWithFamily`/`fullDetailShared` é evento auditável (mudança em dados compartilhados, conforme `00-DECISIONS.md §9`) — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).

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
