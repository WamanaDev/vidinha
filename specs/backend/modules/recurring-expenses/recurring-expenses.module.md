# Módulo `recurring-expenses` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.7`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
enum RecurrenceFrequency {
  MONTHLY
  WEEKLY
  YEARLY
}

type RecurringExpense implements Node {
  id: ID!
  family: Family!
  description: String!
  amount: Float!
  frequency: RecurrenceFrequency!
  nextDueDate: DateTime!
  category: Category
  sharedWithFamily: Boolean!
  owner: User!
}

input CreateRecurringExpenseInput {
  familyId: ID!
  description: String!
  amount: Float!
  frequency: RecurrenceFrequency!
  nextDueDate: DateTime!
  categoryId: ID
  sharedWithFamily: Boolean!
}

input UpdateRecurringExpenseInput {
  id: ID!
  description: String
  amount: Float
  frequency: RecurrenceFrequency
  nextDueDate: DateTime
  categoryId: ID
  sharedWithFamily: Boolean
}

type Query {
  recurringExpenses(familyId: ID!): [RecurringExpense!]!
}

type Mutation {
  createRecurringExpense(input: CreateRecurringExpenseInput!): RecurringExpense!
  updateRecurringExpense(input: UpdateRecurringExpenseInput!): RecurringExpense!
  deleteRecurringExpense(id: ID!): Boolean!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e visão do produto em `CLAUDE.md §1.1`)

- Representa compromissos financeiros **cadastrados manualmente** pelo usuário (aluguel, condomínio, energia, internet, assinaturas, contas domésticas etc. — exemplos explícitos do `CLAUDE.md §1.1`), distintos das transações reais importadas via Open Finance (`Transaction`, ver [`../transactions/transactions.module.md`](../transactions/transactions.module.md)).
- Compartilhamento segue o mesmo princípio opt-in dos demais recursos (`sharedWithFamily`), mas com granularidade **por despesa recorrente individual** — não reaproveita necessariamente `SharingPermission` (`scope` não inclui `RECURRING_EXPENSE` no SDL atual de `sharing-permissions`); o campo `sharedWithFamily` é próprio da entidade. Se o produto decidir unificar via `SharingPermission` no futuro, isso exigiria estender o enum `SharingScope`.
- `nextDueDate` é a base para a notificação básica "conta a vencer" prevista no MVP (`00-DECISIONS.md §1`) — o cálculo de avanço de `nextDueDate` após o vencimento (ex.: mensal → soma 1 mês) fica a cargo de um job agendado (fora do escopo deste módulo GraphQL) ou de lógica no service ao consultar despesas vencidas.
- Só o **dono** (`owner`) pode `updateRecurringExpense`/`deleteRecurringExpense` — checagem de posse no service.
- MVP **não inclui** divisão automática de despesas nem metas financeiras (`00-DECISIONS.md §1`) — este módulo não deve antecipar campos para isso (ex.: nenhum campo de "quem paga quanto").
- Autorização de leitura (`recurringExpenses(familyId)`): dono sempre vê as próprias; demais membros só veem as com `sharedWithFamily: true`, mesmo padrão ABAC de `Account`/`Card`.

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/recurring-expenses/
├── recurring-expenses.module.ts
├── recurring-expenses.resolver.ts
├── recurring-expenses.service.ts
├── recurring-expenses.service.spec.ts
├── dto/
│   ├── create-recurring-expense.input.ts
│   └── update-recurring-expense.input.ts
└── entities/
    └── recurring-expense.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). Depende de `Family` e do seed de `Category` (passo 1 de implementação) — ver ordem completa em [`../../00-overview.md §3`](../../00-overview.md).
