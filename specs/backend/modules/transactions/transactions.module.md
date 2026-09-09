# Módulo `transactions` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.5`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

Inclui `Category`, pois `Transaction.category` referencia esse tipo e o SDL original os agrupa na mesma seção; a mutation de gestão de categorias (`createCategory`/`updateCategory`/`deleteCategory`) vive em [`../categories/categories.module.md`](../categories/categories.module.md).

```graphql
type Category implements Node {
  id: ID!
  name: String!
  icon: String
  hiddenFromFamily: Boolean!
}

type Transaction implements Node {
  id: ID!
  description: String!
  amount: Float!
  date: DateTime!
  account: Account!
  card: Card
  category: Category
  hiddenFromFamily: Boolean!
  owner: User!
}

type TransactionEdge {
  cursor: Cursor!
  node: Transaction!
}

type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

input TransactionFilterInput {
  familyId: ID!
  accountId: ID
  cardId: ID
  categoryId: ID
  fromDate: DateTime
  toDate: DateTime
  minAmount: Float
  maxAmount: Float
}

enum TransactionOrderField {
  DATE
  AMOUNT
}

input TransactionOrderInput {
  field: TransactionOrderField!
  direction: OrderDirection!
}

input HideTransactionInput {
  transactionId: ID!
  hiddenFromFamily: Boolean!
}

input UpdateTransactionCategoryInput {
  transactionId: ID!
  categoryId: ID!
}

type Query {
  transactions(
    filter: TransactionFilterInput!
    orderBy: TransactionOrderInput
    first: Int
    after: Cursor
  ): TransactionConnection!
}

type Mutation {
  hideTransaction(input: HideTransactionInput!): Transaction!
  updateTransactionCategory(input: UpdateTransactionCategoryInput!): Transaction!
}
```

Paginação **cursor-based estilo Relay** (`edges`/`node`/`pageInfo`), conforme convenção geral do SDL (ver [`../../00-overview.md §4`](../../00-overview.md)).

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e `specs/02-API-AUTH.md §2.2`)

- Uma transação individual pode ser **ocultada** mesmo dentro de uma conta compartilhada, via `hideTransaction`/`hiddenFromFamily` — flag por transação, independente do compartilhamento da conta que a contém.
- **Regra de visibilidade central (ABAC/CASL):** dono sempre lê sua própria transação; um não-dono só lê a transação **se** ela pertence à sua família **E** `Account.sharedWithFamily = true` (ou o cartão associado) **E** `Transaction.hiddenFromFamily = false` **E** `Transaction.category.hiddenFromFamily = false`. Todas as quatro condições são necessárias — já implementada como exemplo completo no `AbilityFactory` de [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md) (Regra 3), reaproveitar exatamente essa lógica.
- **Só o dono edita/exclui** uma transação, independentemente de compartilhamento — `hideTransaction` e `updateTransactionCategory` exigem checagem de posse no service.
- Detalhe transação-a-transação só é visível a não-donos quando `Account.fullDetailShared = true` (ver [`../accounts/accounts.module.md`](../accounts/accounts.module.md)); sem isso, não-donos só veem valores consolidados (totais por categoria/mês) — a resolução exata de "consolidado" fica a cargo de queries agregadas ainda não especificadas no SDL atual (candidatas a relatórios, `00-DECISIONS.md §1`: "relatório mensal simples por categoria").
- **Recomenda-se usar `@casl/prisma` (`accessibleBy(ability)`)** para traduzir a ability diretamente em cláusula `where` do Prisma na query `transactions`, evitando buscar registros que o usuário não pode ver e depois filtrar em memória (defesa em profundidade + performance) — ver [`../../common/casl-ability-factory.md §3`](../../common/casl-ability-factory.md).
- Categorização: MVP inclui categorização manual (`updateTransactionCategory`) + sugestão simples por regras (merchant → categoria); categorização 100% automática via ML é adiada para v2 (`00-DECISIONS.md §1`).
- Alteração de `hiddenFromFamily`/categoria não está na lista de eventos obrigatoriamente auditados de `00-DECISIONS.md §9` (que cobre família/permissões/Open Finance/conta de usuário) — não é necessário emitir `AuditLog` para essas mutations, diferente de `sharing-permissions`.

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/transactions/
├── transactions.module.ts
├── transactions.resolver.ts
├── transactions.service.ts
├── transactions.service.spec.ts
├── dto/
│   ├── transaction-filter.input.ts
│   ├── transaction-order.input.ts
│   ├── hide-transaction.input.ts
│   └── update-transaction-category.input.ts
└── entities/
    ├── transaction.entity.ts
    ├── transaction-edge.entity.ts
    └── transaction-connection.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). Depende de `open-finance` (dados) e `sharing-permissions` (visibilidade) — ver ordem de implementação em [`../../00-overview.md §3`](../../00-overview.md).
