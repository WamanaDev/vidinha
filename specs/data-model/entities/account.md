# Entidade: `Account`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Conta bancária (corrente, poupança, investimento) — vinda do Open Finance
/// ou cadastrada manualmente (connectionId nulo).
model Account {
  id           String       @id @default(uuid())
  ownerId      String
  connectionId String?
  type         AccountType
  name         String
  /// Últimos 4 dígitos ou identificador não sensível (nunca número completo).
  maskedNumber String?
  currency     String       @default("BRL")
  balance      Decimal      @db.Decimal(14, 2) @default(0)
  balanceUpdatedAt DateTime?
  isManual     Boolean      @default(false)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  /// Soft-delete: conta desconectada ou removida manualmente, preserva transações.
  archivedAt   DateTime?

  owner        User                   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  connection   OpenFinanceConnection? @relation(fields: [connectionId], references: [id])
  cards        Card[]
  transactions Transaction[]
  sharingPermissions SharingPermission[] @relation("AccountSharing")

  @@index([ownerId])
  @@index([connectionId])
  @@index([ownerId, archivedAt])
}
```

Enum usado:

```prisma
enum AccountType {
  CHECKING        // conta corrente
  SAVINGS         // poupança
  INVESTMENT
  OTHER
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da conta. |
| `ownerId` | `String` (FK) | Usuário dono da conta. Toda conta pertence sempre a um `User`, nunca diretamente a uma `Family`. |
| `connectionId` | `String?` (FK) | Conexão Open Finance de origem; nulo quando a conta foi cadastrada manualmente (`isManual = true`). |
| `type` | `AccountType` | Tipo da conta: `CHECKING` (corrente), `SAVINGS` (poupança), `INVESTMENT` ou `OTHER`. |
| `name` | `String` | Nome de exibição da conta (ex.: "Conta Corrente Nubank"). |
| `maskedNumber` | `String?` | Identificador não sensível (últimos 4 dígitos ou similar) — nunca o número completo da conta. |
| `currency` | `String` (default `"BRL"`) | Moeda da conta. Campo existe para permitir futura extensão multi-moeda, mas hoje usa sempre o default `BRL` (ver suposição A6 em [../00-overview.md](../00-overview.md)). |
| `balance` | `Decimal(14,2)` (default `0`) | Saldo atual da conta. |
| `balanceUpdatedAt` | `DateTime?` | Timestamp da última atualização do saldo. |
| `isManual` | `Boolean` (default `false`) | Indica se a conta foi cadastrada manualmente pelo usuário (sem Open Finance) em vez de importada via `connectionId`. |
| `createdAt` | `DateTime` | Data de criação do registro. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |
| `archivedAt` | `DateTime?` | Soft-delete: preenchido quando a conta é desconectada ou removida manualmente, preservando as transações já importadas. |

## 3. Relações

- `owner` → [user.md](user.md): dono da conta (`onDelete: Cascade`).
- `connection` → [open-finance-connection.md](open-finance-connection.md): conexão de origem (opcional).
- `cards` → [card.md](card.md): cartões cuja fatura/débito está vinculado a esta conta (`Card.billingAccountId`).
- `transactions` → [transaction.md](transaction.md): movimentações desta conta.
- `sharingPermissions` (relação nomeada `"AccountSharing"`) → [sharing-permission.md](sharing-permission.md): permissões de compartilhamento concedidas sobre esta conta especificamente.

## 4. Regras de Negócio

- Não existe `familyId` direto em `Account` — a visibilidade por família é sempre derivada via `SharingPermission` (ver seção 3.1 de [../00-overview.md](../00-overview.md)).
- `maskedNumber` nunca deve conter o número completo da conta (requisito de segurança/privacidade, alinhado a `claude.md §22`/LGPD).
- Uma conta compartilhada com uma família via `SharingPermission` (`resourceType = ACCOUNT`) pode ter transações individuais ocultas por `Transaction.hiddenFromFamily`, independentemente do compartilhamento da conta em si (ver [transaction.md](transaction.md)).
- Índice `[ownerId, archivedAt]` cobre a query "contas ativas de um usuário" (ver tabela de índices em [../00-overview.md](../00-overview.md) §6).

## 5. Justificativa de Modelagem

Da seção 5.1 do documento original ("`Account` separado de `Card`"):

> Uma conta bancária e um cartão têm ciclos de vida e semânticas diferentes no Open Finance: uma conta tem saldo corrente e existe independentemente de haver cartões associados; um cartão de crédito tem fatura/limite e pode ou não estar vinculado a uma conta de débito automático (ou nem ter conta associada, no caso de cartão avulso). O Pluggy também retorna `accounts` e depois, separadamente, dados de cartão/fatura associados a um `accountId` de tipo `CREDIT`. Modelar como entidades separadas evita sobrecarregar `Account` com campos que só fazem sentido para cartão, permite que uma `Transaction` referencie exatamente uma origem sem ambiguidade, e reflete a granularidade real de compartilhamento decidida em `00-DECISIONS §1` ("por conta e por cartão" são unidades de compartilhamento distintas).

Da seção 5.4 ("Soft-delete seletivo"): "`Account.archivedAt` / `Card.archivedAt` — uma conta desconectada não deve apagar as transações já importadas."

Da suposição A6 (seção 7): "Moeda fixa em `BRL`... o produto é voltado ao mercado brasileiro (Open Finance BR/Pluggy) e não há indicação de suporte multi-moeda no MVP; o campo foi mantido para não exigir migration futura caso isso mude."
