# Entidade: `Family`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Uma família é o contêiner de compartilhamento (2 a N integrantes).
model Family {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  /// Soft-delete: preserva histórico de auditoria após exclusão da família.
  deletedAt DateTime?

  members            FamilyMember[]
  invites            FamilyInvite[]
  sharingPermissions SharingPermission[]
  recurringExpenses  RecurringExpense[]
  auditLogs          AuditLog[]

  @@index([deletedAt])
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da família, gerado pelo Prisma. |
| `name` | `String` | Nome da família (ex.: "Família Silva"), definido pelo criador. |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |
| `deletedAt` | `DateTime?` | Soft-delete: preserva histórico de auditoria mesmo após a "exclusão" da família pelo usuário. Indexado para consultas de reconciliação/expurgo. |

## 3. Relações

- `members` → [family-member.md](family-member.md): todos os integrantes (ativos e removidos) da família, com papel (`ADMIN`/`MEMBER`).
- `invites` → [family-invite.md](family-invite.md): convites pendentes/respondidos para ingressar nesta família.
- `sharingPermissions` → [sharing-permission.md](sharing-permission.md): permissões de compartilhamento de recursos (contas, cartões, categorias) concedidas a esta família por seus membros.
- `recurringExpenses` → [recurring-expense.md](recurring-expense.md): despesas recorrentes associadas a esta família.
- `auditLogs` → [audit-log.md](audit-log.md): eventos de auditoria relacionados a esta família (criação, alteração de papel de membro, etc.).

## 4. Regras de Negócio

- É o contêiner central do modelo de compartilhamento: um usuário pode pertencer a **múltiplas famílias** (ver `00-DECISIONS §1`, referenciado na justificativa de `SharingPermission`), cada uma com de 2 a N integrantes.
- Não existe `familyId` diretamente em `Account`/`Card`/`Transaction` — a visibilidade da família sobre esses recursos é sempre derivada via `SharingPermission` (ver seção 3 de [../00-overview.md](../00-overview.md)).
- `deletedAt` suporta o fluxo de exclusão de família mantendo `AuditLog` íntegro (relação `onDelete: SetNull` em `AuditLog.family`).

## 5. Justificativa de Modelagem

Ligada à seção 5.4 do documento original ("Soft-delete seletivo"): `Family.deletedAt` é citado explicitamente como um dos campos de soft-delete necessários para suportar "os fluxos de exclusão de família/membro/conta de usuário e o direito à exclusão da LGPD (`00-DECISIONS §10`), mantendo `AuditLog` íntegro (por isso `AuditLog` usa `onDelete: SetNull` em vez de cascade)".

A justificativa de `SharingPermission` como entidade própria (ver [sharing-permission.md](sharing-permission.md)) também depende diretamente do desenho de `Family`: como um usuário pode pertencer a múltiplas famílias, um simples booleano em `Account`/`Card` não seria suficiente para expressar "compartilhado com qual família" — daí a necessidade de uma tabela de permissão própria referenciando `Family`.
