# Entidade: `Transaction`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Movimentação financeira: importada via Open Finance, lançada manualmente,
/// ou gerada a partir de uma RecurringExpense vencida.
model Transaction {
  id          String            @id @default(uuid())
  /// Exatamente um de accountId/cardId deve estar preenchido (validado na camada de serviço).
  accountId   String?
  cardId      String?
  categoryId  String?
  description String
  amount      Decimal           @db.Decimal(14, 2)
  type        TransactionType
  source      TransactionSource @default(MANUAL)
  /// Identificador da transação no Pluggy, para deduplicação em re-sync.
  externalId  String?
  occurredAt  DateTime
  /// Oculta a transação da visão consolidada/compartilhada da família,
  /// mesmo que a conta/cartão esteja compartilhado (ver seção 3).
  hiddenFromFamily Boolean      @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  account  Account?  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  card     Card?     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])

  // Índices para as queries mais comuns:
  // 1) extrato de uma conta em um período
  @@index([accountId, occurredAt])
  // 2) fatura de um cartão em um período
  @@index([cardId, occurredAt])
  // 3) totais por categoria em um período (para relatório mensal)
  @@index([categoryId, occurredAt])
  // 4) deduplicação de sync Open Finance
  @@unique([externalId, accountId, cardId])
  // 5) filtro de visibilidade compartilhada (ver seção 3)
  @@index([hiddenFromFamily])
}
```

Enums usados:

```prisma
enum TransactionType {
  DEBIT
  CREDIT
}

enum TransactionSource {
  OPEN_FINANCE    // veio da sincronização Pluggy
  MANUAL          // lançamento manual do usuário
  RECURRING_EXPENSE // gerado a partir de um RecurringExpense vencido
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da transação. |
| `accountId` | `String?` (FK) | Conta de origem, quando aplicável. Exatamente um entre `accountId`/`cardId` deve estar preenchido — regra validada na camada de serviço, não no schema. |
| `cardId` | `String?` (FK) | Cartão de origem, quando aplicável. |
| `categoryId` | `String?` (FK) | Categoria da transação, opcional. |
| `description` | `String` | Descrição da movimentação. |
| `amount` | `Decimal(14,2)` | Valor da transação. |
| `type` | `TransactionType` | `DEBIT` ou `CREDIT`. |
| `source` | `TransactionSource` (default `MANUAL`) | Origem da transação: `OPEN_FINANCE` (sincronização Pluggy), `MANUAL` (lançamento do usuário) ou `RECURRING_EXPENSE` (gerada a partir de uma despesa recorrente vencida). |
| `externalId` | `String?` | Identificador da transação no Pluggy, usado para deduplicação em re-sync. |
| `occurredAt` | `DateTime` | Data/hora em que a movimentação ocorreu. |
| `hiddenFromFamily` | `Boolean` (default `false`) | Oculta a transação de toda e qualquer visão da família, mesmo que a conta/cartão esteja compartilhado — ver seção 4 abaixo e seção 3 de [../00-overview.md](../00-overview.md). |
| `createdAt` | `DateTime` | Data de criação do registro. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |

## 3. Relações

- `account` → [account.md](account.md): conta de origem (opcional, `onDelete: Cascade`).
- `card` → [card.md](card.md): cartão de origem (opcional, `onDelete: Cascade`).
- `category` → [category.md](category.md): categoria da transação (opcional).

## 4. Regras de Negócio

- **Exclusividade `accountId`/`cardId`:** exatamente um dos dois deve estar preenchido (nunca ambos, nunca nenhum) — validado na camada de serviço, pois o Prisma Schema Language não expressa essa regra de exclusividade mútua diretamente.
- **Deduplicação de sync:** `@@unique([externalId, accountId, cardId])` evita duplicar a mesma transação do Pluggy em re-sincronizações.
- **Flag `hiddenFromFamily` (regra central de privacidade da transação):**
  - É um campo booleano por transação, independente do compartilhamento da conta/cartão.
  - Mesmo que a `Account`/`Card` esteja com `SharingPermission` ativa (com ou sem `allowFullDetail`) para uma família, qualquer `Transaction` com `hiddenFromFamily = true` é excluída de **toda e qualquer visão da família**, incluindo os totais consolidados por categoria — não entra nem no extrato detalhado nem no somatório.
  - Só o `ownerId` da conta/cartão dono da transação pode alterar essa flag; a alteração é um evento auditado (`AuditAction.TRANSACTION_HIDDEN_TOGGLED`, ver [audit-log.md](audit-log.md)).
  - Transações com `hiddenFromFamily = false` (padrão) seguem a regra normal de `SharingPermission.allowFullDetail`: se `false`, a transação entra apenas no agregado consolidado por categoria/mês exibido à família, nunca linha a linha.
- Índices cobrem: extrato de conta por período, fatura de cartão por período, totais por categoria por período, deduplicação de sync, e filtro de visibilidade compartilhada (ver seção 6 de [../00-overview.md](../00-overview.md)).
- Não possui soft-delete próprio — é removida em cascata apenas quando a `Account`/`Card` pai é de fato excluída (fluxo de exclusão total de conta de usuário).

## 5. Justificativa de Modelagem

Da seção 3.3 do documento original ("Flag `hiddenFromFamily`"), reproduzida integralmente na regra de negócio acima — é a justificativa central desta entidade, ligada a `claude.md §5` item 11 e `00-DECISIONS §1`.

Da seção 5.3 ("`RecurringExpense` separado de `Transaction`"):

> `RecurringExpense` representa a **regra**..., enquanto `Transaction` representa uma **ocorrência financeira concreta**... Misturá-los exigiria que `Transaction` carregasse campos de recorrência (`frequency`, `dueDay`, `endDate`) preenchidos em `null` para 99% das linhas (todas as transações de Open Finance)... O campo `TransactionSource.RECURRING_EXPENSE` documenta a ligação: quando um `RecurringExpense` vence, o sistema pode... gerar uma `Transaction` correspondente para fins de relatório consolidado, sem que isso pertença ao Open Finance.

Da seção 5.4 ("Soft-delete seletivo"): "`Transaction`... não t[em] soft-delete próprio porque nunca [é] removida diretamente pelo usuário nesta versão do modelo — [é] removida em cascata quando a entidade pai (`Account`/`Card`) é de fato excluída."
