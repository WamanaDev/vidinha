# Entidade: `User`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Espelho local do usuário autenticado via Supabase Auth.
/// `id` é o mesmo UUID do `auth.users.id` do Supabase (não gerado pelo Prisma).
model User {
  id          String   @id // = Supabase auth.users.id (uuid)
  email       String   @unique
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  /// Soft-delete: usuário solicitou exclusão de conta (LGPD, ver 00-DECISIONS §10).
  deletedAt   DateTime?

  familyMemberships     FamilyMember[]
  sentInvites           FamilyInvite[]        @relation("InviteSender")
  connections           OpenFinanceConnection[]
  accounts              Account[]
  cards                 Card[]
  categories            Category[]
  recurringExpenses     RecurringExpense[]
  sharingPermissions    SharingPermission[]
  auditLogs             AuditLog[]

  @@index([deletedAt])
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK) | Não é gerado pelo Prisma (`@default(uuid())` ausente de propósito) — é o mesmo UUID do `auth.users.id` do Supabase, ou seja, o `sub` do JWT emitido pelo Supabase Auth. `User` é um espelho local, não a fonte de verdade da identidade/credenciais. |
| `email` | `String` único | E-mail do usuário, espelhado do Supabase Auth. Único no sistema. |
| `displayName` | `String?` | Nome de exibição, opcional (pode não ter sido preenchido ainda no onboarding). |
| `avatarUrl` | `String?` | URL da foto de perfil, opcional. |
| `createdAt` | `DateTime` | Data de criação do registro local (não necessariamente igual à data de criação no Supabase Auth). |
| `updatedAt` | `DateTime` | Atualizado automaticamente (`@updatedAt`) a cada alteração do registro. |
| `deletedAt` | `DateTime?` | Soft-delete: marcado quando o usuário solicita exclusão de conta (fluxo de direito à exclusão da LGPD). Indexado para consultas de reconciliação/expurgo. |

## 3. Relações

- `familyMemberships` → [family-member.md](family-member.md): todas as associações do usuário a famílias (histórico, incluindo removidas).
- `sentInvites` (relação nomeada `"InviteSender"`) → [family-invite.md](family-invite.md): convites que este usuário enviou como administrador de uma família.
- `connections` → [open-finance-connection.md](open-finance-connection.md): conexões Open Finance (itens Pluggy) que o usuário autorizou.
- `accounts` → [account.md](account.md): contas bancárias (Open Finance ou manuais) das quais o usuário é dono (`ownerId`).
- `cards` → [card.md](card.md): cartões dos quais o usuário é dono.
- `categories` → [category.md](category.md): categorias customizadas criadas pelo usuário (categorias de sistema têm `ownerId = null`, não pertencem a nenhum `User`).
- `recurringExpenses` → [recurring-expense.md](recurring-expense.md): despesas recorrentes cadastradas por este usuário (`createdById`).
- `sharingPermissions` → [sharing-permission.md](sharing-permission.md): permissões de compartilhamento que este usuário concedeu como dono de um recurso.
- `auditLogs` → [audit-log.md](audit-log.md): eventos de auditoria em que este usuário é o ator (`actorId`).

## 4. Regras de Negócio

- `id` não é gerado localmente — é sempre importado do Supabase Auth no momento do primeiro login/cadastro; nunca deve ser gerado por `@default(uuid())` para evitar dessincronização com o provedor de identidade.
- Soft-delete via `deletedAt` suporta o fluxo de exclusão de conta de usuário previsto pela LGPD (ver `00-DECISIONS §10`), preservando o histórico de `AuditLog` (que usa `onDelete: SetNull` em vez de cascade quando o ator é removido).

## 5. Justificativa de Modelagem

Não há uma seção de justificativa dedicada a `User` isoladamente no documento original — a entidade é a base identitária do sistema e seu desenho segue diretamente da decisão de usar Supabase Auth como provedor de autenticação (`00-DECISIONS.md`), sem modelagem alternativa considerada.

Relacionado à seção 5.4 do documento original ("Soft-delete seletivo"): `User.deletedAt` é um dos quatro campos de soft-delete citados como obrigatórios pelos fluxos de exclusão (junto com `Family.deletedAt`, `FamilyMember.removedAt`), mantendo `AuditLog` íntegro por usar `onDelete: SetNull`.
