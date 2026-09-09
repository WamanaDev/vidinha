# Módulo `categories` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.8` (mutations) e `§3.5` (o `type Category` em si, compartilhado com `transactions`). Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

O `type Category` já é declarado em [`../transactions/transactions.module.md`](../transactions/transactions.module.md) (referenciado por `Transaction.category` e `RecurringExpense.category`); este módulo é responsável pelas mutations de gestão:

```graphql
type Category implements Node {
  id: ID!
  name: String!
  icon: String
  hiddenFromFamily: Boolean!
}

input CreateCategoryInput {
  familyId: ID!
  name: String!
  icon: String
}

input UpdateCategoryInput {
  id: ID!
  name: String
  icon: String
  hiddenFromFamily: Boolean
}

type Query {
  categories(familyId: ID!): [Category!]!
}

type Mutation {
  createCategory(input: CreateCategoryInput!): Category!
  updateCategory(input: UpdateCategoryInput!): Category!
  deleteCategory(id: ID!): Boolean!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e `specs/02-API-AUTH.md §2.2`)

- Categorias existem em dois "níveis": um **catálogo padrão global** (seed com `ownerId = null`, ver `prisma/seed.ts` na estrutura de `../../00-overview.md §1`) e categorias **customizadas por família** (`createCategory` com `familyId`). O contrato GraphQL atual não distingue explicitamente os dois no SDL — ao implementar, considerar se `Category` precisa de um campo adicional (ex.: `isDefault: Boolean!`) para o client diferenciar categorias editáveis de globais; **suposição a validar com produto**, pois não está coberta em `00-DECISIONS.md`.
- `hiddenFromFamily`: quando uma categoria é marcada como oculta, **toda transação daquela categoria deixa de ser visível para não-donos**, mesmo que a conta/transação individual esteja compartilhada — é uma das quatro condições da regra ABAC central de `Transaction` (ver [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md), Regra 3: `'category.hiddenFromFamily': false`). Isso dá ao usuário um mecanismo de ocultação em lote (por categoria) além da ocultação individual por transação (`Transaction.hiddenFromFamily`).
- Categorização no MVP é manual + sugestão simples por regras (merchant → categoria) — não há categorização automática via ML (`00-DECISIONS.md §1`, adiado para v2). Este módulo não expõe endpoint de sugestão automática; a sugestão por regras, se implementada, entra como lógica interna do service de `transactions` ao criar/importar uma transação, não como mutation pública aqui.
- `deleteCategory` de uma categoria em uso por transações existentes precisa de uma política de fallback (ex.: mover transações para "Outros" ou impedir a exclusão) — não definida em `00-DECISIONS.md`; **suposição a validar**: bloquear a exclusão (retornar `CONFLICT`) enquanto houver transações/despesas recorrentes vinculadas, seguindo o princípio "fail secure" de `CLAUDE.md §55`.
- Só é permitido editar/excluir categorias da própria família (`familyId` do usuário) — categorias do catálogo global (`ownerId = null`) não devem ser editáveis/excluíveis por usuários finais.

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/categories/
├── categories.module.ts
├── categories.resolver.ts
├── categories.service.ts
├── categories.service.spec.ts
├── dto/
│   ├── create-category.input.ts
│   └── update-category.input.ts
└── entities/
    └── category.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). Depende de `Family` e do seed inicial de categorias (passo 1 de implementação) — ver ordem completa em [`../../00-overview.md §3`](../../00-overview.md).
