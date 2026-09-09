# Módulo `cards` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.5`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
type Card implements Node {
  id: ID!
  name: String!
  lastFourDigits: String
  limit: Float
  currentInvoice: Float
  dueDate: DateTime
  sharedWithFamily: Boolean!
  owner: User!
}

input UpdateCardSharingInput {
  cardId: ID!
  sharedWithFamily: Boolean!
}

type Query {
  cards(familyId: ID!): [Card!]!
}

type Mutation {
  updateCardSharing(input: UpdateCardSharingInput!): Card!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e `§2`)

- **Cartão compartilhado** segue o mesmo princípio de `Account`: opt-in explícito do dono, nunca automático. Granularidade **por cartão** — não há herança automática do compartilhamento da conta associada.
- `Card` não tem campo `fullDetailShared` próprio no SDL — diferente de `Account`, o cartão só expõe dados já agregados (`limit`, `currentInvoice`, `dueDate`); o detalhe transação-a-transação de compras no cartão é controlado pelo `fullDetailShared` da conta/carteira à qual as transações pertencem (via `Transaction.card`), não por um flag próprio em `Card`.
- **Dados de cartão nunca incluem PAN completo ou CVV** — `lastFourDigits` é o único identificador exposto, consistente com o dado agregado fornecido pelo Pluggy (`00-DECISIONS.md §2`) e com o escopo de PCI-DSS tratado como fora do perímetro direto do Vidinha.
- `updateCardSharing` só pode ser executada pelo **dono** do cartão — checagem de posse no service (nunca no DTO).
- Autorização de leitura (`cards(familyId)`): o dono sempre vê seus próprios cartões; os demais membros da família só veem cartões com `sharedWithFamily: true`.
- Cartões originam-se de conexões Open Finance (`AccountType.CREDIT_CARD_WALLET` na carteira associada, ver [`../open-finance/open-finance.module.md`](../open-finance/open-finance.module.md) e [`../accounts/accounts.module.md`](../accounts/accounts.module.md)).
- Alteração de `sharedWithFamily` é evento auditável (`00-DECISIONS.md §9`) — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/cards/
├── cards.module.ts
├── cards.resolver.ts
├── cards.service.ts
├── cards.service.spec.ts
├── dto/
│   └── update-card-sharing.input.ts
└── entities/
    └── card.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). Implementado junto de `accounts`/`transactions` no núcleo de valor do produto (ver ordem de implementação em [`../../00-overview.md §3`](../../00-overview.md)).
