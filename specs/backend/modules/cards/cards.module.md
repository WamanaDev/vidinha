# Módulo `cards` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.5`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
enum CardType {
  CREDIT
  DEBIT
  PREPAID
}

# SUPOSIÇÃO: `type`/`brand` foram adicionados ao ObjectType (ausentes no
# rascunho original deste contrato) — necessários para o cadastro manual de
# cartão (`createCard`), que precisa que o usuário informe o tipo do cartão.
type Card implements Node {
  id: ID!
  name: String!
  type: CardType!
  brand: String
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

# Cadastro manual de cartão (sem Open Finance) — sempre cria com
# `isManual: true`, `connectionId: null`. `familyId` só é usado para checar
# que o chamador é membro ativo. `billingAccountId`, se informado, precisa
# pertencer ao mesmo usuário.
input CreateCardInput {
  familyId: ID!
  name: String!
  type: CardType!
  brand: String
  lastFourDigits: String
  billingAccountId: ID
  creditLimit: Float
  currentInvoice: Float # fatura/saldo inicial, default 0
}

# Edição de cartão manual. Só permitido quando `isManual: true` e o chamador
# é o dono. `type` não é editável após a criação.
input UpdateCardInput {
  id: ID!
  name: String
  brand: String
  lastFourDigits: String
  billingAccountId: ID
  creditLimit: Float
  currentInvoice: Float
}

type Query {
  cards(familyId: ID!): [Card!]!
}

type Mutation {
  updateCardSharing(input: UpdateCardSharingInput!): Card!
  createCard(input: CreateCardInput!): Card!
  updateCard(input: UpdateCardInput!): Card!
  archiveCard(id: ID!): Boolean! # soft-delete (archivedAt), só isManual + dono
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e `§2`)

- **Cartão compartilhado** segue o mesmo princípio de `Account`: opt-in explícito do dono, nunca automático. Granularidade **por cartão** — não há herança automática do compartilhamento da conta associada.
- `Card` não tem campo `fullDetailShared` próprio no SDL — diferente de `Account`, o cartão só expõe dados já agregados (`limit`, `currentInvoice`, `dueDate`); o detalhe transação-a-transação de compras no cartão é controlado pelo `fullDetailShared` da conta/carteira à qual as transações pertencem (via `Transaction.card`), não por um flag próprio em `Card`.
- **Dados de cartão nunca incluem PAN completo ou CVV** — `lastFourDigits` é o único identificador exposto, consistente com o dado agregado fornecido pelo Pluggy (`00-DECISIONS.md §2`) e com o escopo de PCI-DSS tratado como fora do perímetro direto do Vidinha.
- `updateCardSharing` só pode ser executada pelo **dono** do cartão — checagem de posse no service (nunca no DTO).
- Autorização de leitura (`cards(familyId)`): o dono sempre vê seus próprios cartões; os demais membros da família só veem cartões com `sharedWithFamily: true`.
- Cartões originam-se de conexões Open Finance (ver [`../open-finance/open-finance.module.md`](../open-finance/open-finance.module.md)) ou são cadastrados manualmente (`isManual: true`, `connectionId: null`).
- Alteração de `sharedWithFamily` é evento auditável (`00-DECISIONS.md §9`) — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).
- **CRUD manual** (`createCard`/`updateCard`/`archiveCard`): espelha exatamente o CRUD manual de `Account` (ver `accounts.module.md`). `createCard` sempre cria com `isManual: true`, `connectionId: null`, `currentInvoice` nunca fica `null` (default 0) para que os incrementos de `TransactionsService` funcionem sem tratar `null` como caso especial. `updateCard`/`archiveCard` exigem `isManual: true` e que o chamador seja o dono. SUPOSIÇÃO: para cartões manuais, `currentInvoice` é tratado como "valor devido" (fatura em aberto) para qualquer `CardType` (CREDIT/DEBIT/PREPAID), já que o schema não tem um campo de saldo específico por tipo — uma transação `DEBIT` aumenta `currentInvoice`, uma `CREDIT` diminui. Eventos `CARD_CREATED`/`CARD_UPDATED`/`CARD_ARCHIVED` são auditados.

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
