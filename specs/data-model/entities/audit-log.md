# Entidade: `AuditLog`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Log de auditoria imutável (nunca é atualizado ou apagado por soft-delete
/// de outras entidades — ver 00-DECISIONS §9, retenção mínima 12 meses).
model AuditLog {
  id        String      @id @default(uuid())
  actorId   String?     // nulo em eventos de sistema (ex.: job de reconciliação)
  familyId  String?
  action    AuditAction
  /// Dados adicionais do evento (ex.: role anterior/novo, ip, userAgent).
  metadata  Json?
  createdAt DateTime    @default(now())

  actor  User?   @relation(fields: [actorId], references: [id], onDelete: SetNull)
  family Family? @relation(fields: [familyId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([familyId, createdAt])
  @@index([action, createdAt])
}
```

Enum usado:

```prisma
enum AuditAction {
  LOGIN
  LOGOUT
  FAMILY_CREATED
  FAMILY_DELETED
  FAMILY_MEMBER_ROLE_CHANGED
  FAMILY_MEMBER_REMOVED
  FAMILY_INVITE_CREATED
  FAMILY_INVITE_ACCEPTED
  OPEN_FINANCE_CONNECTED
  OPEN_FINANCE_REVOKED
  SHARING_PERMISSION_CREATED
  SHARING_PERMISSION_UPDATED
  SHARING_PERMISSION_REVOKED
  TRANSACTION_HIDDEN_TOGGLED
  USER_ACCOUNT_DELETION_REQUESTED
  USER_ACCOUNT_DELETED
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único do evento de auditoria. |
| `actorId` | `String?` (FK) | Usuário que realizou a ação; nulo em eventos de sistema (ex.: job de reconciliação). |
| `familyId` | `String?` (FK) | Família afetada, quando aplicável. |
| `action` | `AuditAction` | Tipo do evento auditado (ver enum acima). |
| `metadata` | `Json?` | Dados adicionais do evento (ex.: role anterior/novo, IP, User-Agent) — formato livre por tipo de evento. |
| `createdAt` | `DateTime` | Data/hora do evento. |

## 3. Relações

- `actor` → [user.md](user.md): usuário que realizou a ação (`onDelete: SetNull` — a exclusão do usuário não apaga o log, apenas anula a referência).
- `family` → [family.md](family.md): família afetada pelo evento, quando aplicável (`onDelete: SetNull`).

## 4. Regras de Negócio

- **Imutabilidade:** o log nunca é atualizado ou apagado por soft-delete de outras entidades — é a única tabela do modelo que usa `onDelete: SetNull` em vez de `Cascade` nas suas FKs, justamente para sobreviver à exclusão de `User`/`Family`.
- **Retenção mínima de 12 meses** conforme `00-DECISIONS §9`.
- Eventos cobertos pelo enum `AuditAction` incluem login/logout, ciclo de vida de família (criação, exclusão, mudança de papel de membro, remoção de membro), convites, conexões Open Finance (conectada/revogada), ciclo de vida de `SharingPermission` (criada/atualizada/revogada), alternância de `Transaction.hiddenFromFamily`, e solicitação/efetivação de exclusão de conta de usuário.
- `TRANSACTION_HIDDEN_TOGGLED` é um evento de auditoria obrigatório sempre que a flag `hiddenFromFamily` de uma transação é alterada (ver [transaction.md](transaction.md)), pois afeta diretamente a transparência financeira compartilhada com a família.

## 5. Justificativa de Modelagem

Da seção 5.5 do documento original ("`AuditLog` com `metadata: Json`"):

> Os eventos auditáveis listados em `00-DECISIONS §9` têm formatos de payload muito diferentes entre si (mudança de role carrega "role anterior/novo"; revogação de Open Finance carrega o `pluggyItemId`; etc.). Uma coluna `Json` evita criar dezenas de tabelas de auditoria especializadas (uma por tipo de evento) mantendo a tabela única, indexável por `action`/`actorId`/`familyId`/`createdAt` — suficiente para os relatórios de auditoria e para a política de retenção mínima de 12 meses.

Da seção 5.4 ("Soft-delete seletivo"): "`Family.deletedAt`, `FamilyMember.removedAt`, `User.deletedAt`... mantendo `AuditLog` íntegro (por isso `AuditLog` usa `onDelete: SetNull` em vez de cascade)."

Da suposição A3 (seção 7):

> `AuditAction.TRANSACTION_HIDDEN_TOGGLED` foi adicionado à lista de eventos auditáveis. `00-DECISIONS §9` lista os eventos obrigatórios mas não menciona explicitamente a alternância de `hiddenFromFamily`; como essa ação tem impacto direto sobre o que a família vê (afeta transparência financeira compartilhada), foi tratada como extensão natural e de baixo risco da lista existente, não como uma nova política.
