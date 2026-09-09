# Entidade: `Card`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Cartão (crédito/débito/pré-pago). Entidade própria, não um campo de Account
/// (ver justificativa de modelagem na seção 6).
model Card {
  id              String   @id @default(uuid())
  ownerId         String
  /// Conta de fatura/débito vinculada (opcional: cartão pode não ter conta associada no MVP).
  billingAccountId String?
  type            CardType
  brand           String?  // ex.: "VISA", "MASTERCARD" — string livre, sem enum fechado
  name            String
  /// Últimos 4 dígitos apenas (nunca PAN completo — ver 00-DECISIONS §2 sobre PCI-DSS).
  lastFourDigits  String?
  creditLimit     Decimal? @db.Decimal(14, 2)
  currentInvoice  Decimal? @db.Decimal(14, 2)
  isManual        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  archivedAt      DateTime?

  owner          User          @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  billingAccount Account?      @relation(fields: [billingAccountId], references: [id])
  transactions   Transaction[]
  sharingPermissions SharingPermission[] @relation("CardSharing")

  @@index([ownerId])
  @@index([billingAccountId])
  @@index([ownerId, archivedAt])
}
```

Enum usado:

```prisma
enum CardType {
  CREDIT
  DEBIT
  PREPAID
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único do cartão. |
| `ownerId` | `String` (FK) | Usuário dono do cartão. |
| `billingAccountId` | `String?` (FK) | Conta de fatura/débito automático vinculada; opcional, pois nem todo cartão retornado pelo Pluggy tem essa associação identificável (ver suposição A5). |
| `type` | `CardType` | Tipo do cartão: `CREDIT`, `DEBIT` ou `PREPAID`. |
| `brand` | `String?` | Bandeira do cartão (ex.: `"VISA"`, `"MASTERCARD"`) — string livre, sem enum fechado, pois não há um conjunto finito controlado pelo Vidinha. |
| `name` | `String` | Nome de exibição do cartão. |
| `lastFourDigits` | `String?` | Apenas os últimos 4 dígitos — nunca o PAN (número completo) do cartão, por exigência de segurança relacionada ao PCI-DSS (`00-DECISIONS §2`). |
| `creditLimit` | `Decimal(14,2)?` | Limite de crédito, quando aplicável (cartões de crédito). |
| `currentInvoice` | `Decimal(14,2)?` | Valor da fatura atual, quando aplicável. |
| `isManual` | `Boolean` (default `false`) | Indica se o cartão foi cadastrado manualmente (sem Open Finance). |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |
| `archivedAt` | `DateTime?` | Soft-delete: cartão desconectado/removido, preserva transações já importadas. |

## 3. Relações

- `owner` → [user.md](user.md): dono do cartão (`onDelete: Cascade`).
- `billingAccount` → [account.md](account.md): conta de fatura/débito vinculada (opcional).
- `transactions` → [transaction.md](transaction.md): movimentações deste cartão.
- `sharingPermissions` (relação nomeada `"CardSharing"`) → [sharing-permission.md](sharing-permission.md): permissões de compartilhamento concedidas sobre este cartão especificamente.

## 4. Regras de Negócio

- Assim como `Account`, não possui `familyId` direto — a visibilidade por família é sempre derivada via `SharingPermission`.
- `lastFourDigits` nunca deve conter o PAN completo do cartão — requisito direto de escopo de PCI-DSS (`claude.md §23`).
- `billingAccountId` é opcional (suposição A5, seção 7 de [../00-overview.md](../00-overview.md)): "nem todo cartão (especialmente cartões de crédito 'avulsos' retornados pelo Pluggy) tem uma conta de débito automático identificável no MVP".
- O compartilhamento de um cartão com uma família é independente do compartilhamento da conta de fatura associada — são unidades de compartilhamento distintas (ver `00-DECISIONS §1`).

## 5. Justificativa de Modelagem

Da seção 5.1 do documento original ("`Account` separado de `Card`"), aplicável simetricamente a `Card`:

> Modelar como entidades separadas evita sobrecarregar `Account` com campos que só fazem sentido para cartão (`creditLimit`, `currentInvoice`, `lastFourDigits`, `brand`); permite que uma `Transaction` referencie exatamente uma origem (conta OU cartão) sem ambiguidade de "é uma transação da conta corrente ou da fatura do cartão vinculado a ela?"; reflete a granularidade real de compartilhamento decidida em `00-DECISIONS §1` ("por conta e por cartão" são unidades de compartilhamento distintas — um usuário pode compartilhar a conta corrente mas não o cartão de crédito, ou vice-versa).

Da seção 5.4 ("Soft-delete seletivo"): "`Account.archivedAt` / `Card.archivedAt` — uma conta desconectada não deve apagar as transações já importadas."

Da suposição A5 (seção 7): "`Card.billingAccountId` é opcional. Assumido porque nem todo cartão... tem uma conta de débito automático identificável no MVP."
