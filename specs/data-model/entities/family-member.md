# Entidade: `FamilyMember`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Associação N:N entre User e Family, com papel (RBAC).
model FamilyMember {
  id        String     @id @default(uuid())
  familyId  String
  userId    String
  role      FamilyRole @default(MEMBER)
  joinedAt  DateTime   @default(now())
  /// Soft-delete: saída/remoção do membro, mantém histórico de auditoria.
  removedAt DateTime?

  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([familyId, userId])
  @@index([userId])
  @@index([familyId, role])
}
```

Enum usado:

```prisma
enum FamilyRole {
  ADMIN
  MEMBER
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da associação. |
| `familyId` | `String` (FK) | Referência à `Family`. |
| `userId` | `String` (FK) | Referência ao `User`. |
| `role` | `FamilyRole` (default `MEMBER`) | Papel do usuário dentro da família: `ADMIN` ou `MEMBER` (RBAC — ver `claude.md §36`). |
| `joinedAt` | `DateTime` | Data em que o usuário ingressou na família. |
| `removedAt` | `DateTime?` | Soft-delete: preenchido quando o membro sai ou é removido da família, preservando histórico de auditoria. |

## 3. Relações

- `family` → [family.md](family.md): a família à qual esta associação pertence (`onDelete: Cascade` — se a família for excluída de fato no banco, as associações são removidas junto).
- `user` → [user.md](user.md): o usuário associado (`onDelete: Cascade`).

## 4. Regras de Negócio

- Constraint `@@unique([familyId, userId])`: um usuário não pode ter mais de uma associação ativa/histórica com a mesma família representada por linhas duplicadas — a mesma combinação família+usuário é única.
- `FamilyMember.removedAt IS NULL` é a condição usada pela camada de aplicação (resolvers NestJS + CASL) para considerar um membro "ativo" antes de conceder acesso a dados compartilhados da família (ver seção 3.1 de [../00-overview.md](../00-overview.md)).
- Índice `[familyId, role]` cobre a query "membros ativos de uma família por papel" (ver tabela de índices em [../00-overview.md](../00-overview.md) §6).
- É a tabela de associação N:N entre `User` e `Family` — um usuário pode ter múltiplas linhas de `FamilyMember` (uma por família de que participa), e uma família pode ter múltiplos membros.

## 5. Justificativa de Modelagem

Não há uma seção de justificativa dedicada isoladamente a `FamilyMember` no documento original; seu desenho decorre diretamente da decisão de suportar múltiplas famílias por usuário e do modelo RBAC (`ADMIN`/`MEMBER`) referenciado em `claude.md §36` e `00-DECISIONS.md §1`. O soft-delete via `removedAt` segue o mesmo racional descrito na seção 5.4 do documento original ("Soft-delete seletivo"): suporta "os fluxos de exclusão de família/membro/conta de usuário... mantendo `AuditLog` íntegro".
