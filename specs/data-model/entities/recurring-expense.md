# Entidade: `RecurringExpense`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Compromisso recorrente cadastrado manualmente (aluguel, condomínio, internet etc.).
/// Distinto de Transaction: representa a "regra" da recorrência, não cada ocorrência.
model RecurringExpense {
  id          String              @id @default(uuid())
  /// Quem cadastrou o compromisso.
  createdById String
  /// Família à qual o compromisso pertence (compromissos recorrentes são,
  /// por natureza, sempre associados a uma família — ver suposição A1, seção 7).
  familyId    String
  categoryId  String?
  name        String
  amount      Decimal             @db.Decimal(14, 2)
  frequency   RecurrenceFrequency @default(MONTHLY)
  dueDay      Int                 // dia do mês/ciclo de vencimento (1-31)
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  archivedAt  DateTime?

  createdBy User     @relation(fields: [createdById], references: [id], onDelete: Cascade)
  family    Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  category  Category? @relation(fields: [categoryId], references: [id])

  @@index([familyId, isActive])
  @@index([createdById])
}
```

Enum usado:

```prisma
enum RecurrenceFrequency {
  WEEKLY
  MONTHLY
  BIMONTHLY
  QUARTERLY
  SEMIANNUAL
  ANNUAL
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único do compromisso recorrente. |
| `createdById` | `String` (FK) | Usuário que cadastrou o compromisso. |
| `familyId` | `String` (FK, obrigatório) | Família à qual o compromisso pertence — sempre associado a uma família por natureza (suposição A1). |
| `categoryId` | `String?` (FK) | Categoria do compromisso, opcional. |
| `name` | `String` | Nome do compromisso (ex.: "Aluguel", "Internet"). |
| `amount` | `Decimal(14,2)` | Valor do compromisso. |
| `frequency` | `RecurrenceFrequency` (default `MONTHLY`) | Frequência: `WEEKLY`, `MONTHLY`, `BIMONTHLY`, `QUARTERLY`, `SEMIANNUAL` ou `ANNUAL`. |
| `dueDay` | `Int` | Dia do mês/ciclo de vencimento (1–31). |
| `startDate` | `DateTime` | Data de início da vigência do compromisso. |
| `endDate` | `DateTime?` | Data de término, quando aplicável (compromisso com prazo definido). |
| `isActive` | `Boolean` (default `true`) | Indica se o compromisso está ativo. |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |
| `archivedAt` | `DateTime?` | Soft-delete/arquivamento do compromisso. |

## 3. Relações

- `createdBy` → [user.md](user.md): quem cadastrou o compromisso (`onDelete: Cascade`).
- `family` → [family.md](family.md): família à qual o compromisso pertence (`onDelete: Cascade`).
- `category` → [category.md](category.md): categoria do compromisso, opcional.
- Ligação indireta com [transaction.md](transaction.md) via `TransactionSource.RECURRING_EXPENSE`: quando o compromisso vence, o sistema pode gerar uma `Transaction` correspondente (regra de negócio de backend, fora do escopo desta spec de dados).

## 4. Regras de Negócio

- `familyId` é **obrigatório**, não opcional — todo `RecurringExpense` é criado no contexto de uma família, mesmo que o `createdById` identifique quem cadastrou. O compromisso em si é sempre visível a todos os membros da família, **sem** a granularidade de compartilhamento adicional que `Account`/`Card`/`Category` exigem via `SharingPermission` (ver suposição A1).
- Representa a **regra** da recorrência ("Aluguel, R$ 1.800, todo dia 5, mensal"), não cada ocorrência financeira concreta — isso é papel de `Transaction`.
- Índice `[familyId, isActive]` cobre a query "despesas recorrentes ativas de uma família".

## 5. Justificativa de Modelagem

Da seção 5.3 do documento original ("`RecurringExpense` separado de `Transaction`"):

> `RecurringExpense` representa a **regra**..., enquanto `Transaction` representa uma **ocorrência financeira concreta**... Misturá-los exigiria que `Transaction` carregasse campos de recorrência (`frequency`, `dueDay`, `endDate`) preenchidos em `null` para 99% das linhas..., e não haveria como representar "o aluguel deste mês ainda não venceu" sem uma linha de transação fantasma.

Da suposição A1 (seção 7):

> `RecurringExpense` sempre pertence a uma família (`familyId` obrigatório, não opcional). `00-DECISIONS.md` não define se uma despesa recorrente pode ser puramente pessoal (sem família). Como o próprio `claude.md` já lista "contas recorrentes" (aluguel, condomínio etc.) como exemplo central de despesa *compartilhada*, assumimos que todo `RecurringExpense` é criado no contexto de uma família... Caso o produto queira despesas recorrentes puramente pessoais no futuro, basta tornar `familyId` opcional.
