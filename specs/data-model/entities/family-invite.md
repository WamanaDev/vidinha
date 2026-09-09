# Entidade: `FamilyInvite`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Convite para ingressar em uma família (fluxo de onboarding de novo membro).
model FamilyInvite {
  id          String             @id @default(uuid())
  familyId    String
  invitedById String
  email       String
  status      FamilyInviteStatus @default(PENDING)
  token       String             @unique
  expiresAt   DateTime
  createdAt   DateTime           @default(now())
  respondedAt DateTime?

  family    Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
  invitedBy User   @relation("InviteSender", fields: [invitedById], references: [id])

  @@index([familyId, status])
  @@index([email])
}
```

Enum usado:

```prisma
enum FamilyInviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  REVOKED
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único do convite. |
| `familyId` | `String` (FK) | Família para a qual o convite foi emitido. |
| `invitedById` | `String` (FK) | Usuário (administrador da família) que enviou o convite. |
| `email` | `String` | E-mail do convidado — pode ainda não corresponder a um `User` existente no sistema. |
| `status` | `FamilyInviteStatus` (default `PENDING`) | Estado do convite: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED` ou `REVOKED`. |
| `token` | `String` único | Token único usado no link de convite (ex.: enviado por e-mail) para validar a aceitação sem exigir login prévio. |
| `expiresAt` | `DateTime` | Data/hora de expiração do convite. |
| `createdAt` | `DateTime` | Data de criação do convite. |
| `respondedAt` | `DateTime?` | Data em que o convite foi respondido (aceito, recusado, etc.); nulo enquanto `PENDING`. |

## 3. Relações

- `family` → [family.md](family.md): a família à qual o convite pertence (`onDelete: Cascade`).
- `invitedBy` (relação nomeada `"InviteSender"`) → [user.md](user.md): o usuário que enviou o convite, correspondente a `User.sentInvites`.

## 4. Regras de Negócio

- `token` é único no sistema — usado para validar o link de convite sem exigir que o convidado já esteja autenticado.
- O `email` do convite pode não corresponder a um `User` já cadastrado; o fluxo de aceitação de convite (onboarding de novo membro) é responsável por associar o convite a um `User` no momento do cadastro/login.
- Índice `[familyId, status]` cobre consultas de "convites pendentes de uma família" (tela de gerenciamento de convites).
- Índice `[email]` permite localizar convites pendentes endereçados a um e-mail no momento do cadastro/login desse e-mail.
- Estados terminais (`ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED`) não removem o registro — o histórico de convites é preservado para auditoria (evento `AuditAction.FAMILY_INVITE_CREATED` / `FAMILY_INVITE_ACCEPTED`, ver [audit-log.md](audit-log.md)).

## 5. Justificativa de Modelagem

Não há seção de justificativa dedicada isoladamente no documento original; `FamilyInvite` é o mecanismo natural de onboarding decorrente do modelo de família com múltiplos integrantes (`00-DECISIONS.md §1`) e da necessidade de auditoria de convites (`AuditAction.FAMILY_INVITE_CREATED`, `FAMILY_INVITE_ACCEPTED` na lista de eventos auditáveis do documento original, seção 2 — enum `AuditAction`).
