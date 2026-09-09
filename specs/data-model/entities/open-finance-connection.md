# Entidade: `OpenFinanceConnection`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Representa um "item" Pluggy: uma conexão consentida entre o usuário e uma instituição.
model OpenFinanceConnection {
  id                String            @id @default(uuid())
  userId            String
  institutionId     String
  pluggyItemId      String            @unique
  status            ConnectionStatus  @default(UPDATING)
  /// Timestamp da última sincronização bem-sucedida reportada pelo webhook/job.
  lastSyncedAt      DateTime?
  /// Preenchido quando status = REVOKED; soft-delete lógico (mantém histórico).
  revokedAt         DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  institution Institution @relation(fields: [institutionId], references: [id])
  accounts    Account[]

  @@index([userId, status])
  @@index([status])
}
```

Enum usado:

```prisma
enum ConnectionStatus {
  CONNECTED       // item ativo e sincronizando
  UPDATING        // sincronização Pluggy em andamento
  LOGIN_ERROR     // credenciais inválidas na instituição, requer reautenticação
  OUTDATED        // Pluggy sinalizou item desatualizado
  ERROR           // erro genérico reportado pelo provedor
  REVOKED         // usuário revogou o consentimento (soft-delete lógico)
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único interno da conexão. |
| `userId` | `String` (FK) | Usuário dono da conexão — **nunca** uma família diretamente; o compartilhamento é feito depois, via `SharingPermission`. |
| `institutionId` | `String` (FK) | Instituição financeira à qual a conexão se refere. |
| `pluggyItemId` | `String` único | Identificador do "item" no Pluggy — chave de correlação com o provedor para webhooks e re-sync. |
| `status` | `ConnectionStatus` (default `UPDATING`) | Estado atual da conexão: `CONNECTED` (ativa e sincronizando), `UPDATING` (sync em andamento), `LOGIN_ERROR` (credenciais inválidas, requer reautenticação), `OUTDATED` (Pluggy sinalizou item desatualizado), `ERROR` (erro genérico do provedor), `REVOKED` (consentimento revogado pelo usuário). |
| `lastSyncedAt` | `DateTime?` | Timestamp da última sincronização bem-sucedida, reportado por webhook/job. |
| `revokedAt` | `DateTime?` | Preenchido quando `status = REVOKED`; soft-delete lógico que mantém histórico de transações já importadas. |
| `createdAt` | `DateTime` | Data de criação da conexão. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada mudança de status/sync. |

## 3. Relações

- `user` → [user.md](user.md): dono da conexão (`onDelete: Cascade`).
- `institution` → [institution.md](institution.md): instituição financeira conectada.
- `accounts` → [account.md](account.md): contas obtidas via esta conexão (uma conexão agrega N contas).

## 4. Regras de Negócio

- Pertence sempre a um `User`, nunca a uma `Family` diretamente — reforça o princípio de isolamento por dono descrito na seção 3.1 de [../00-overview.md](../00-overview.md): a visibilidade por família é sempre derivada via `SharingPermission`.
- `status = REVOKED` é obrigatório por decisão de arquitetura (`00-DECISIONS §2`): "marca a conexão como REVOKED... mantém histórico de transações já importadas" — por isso `revokedAt` existe como soft-delete lógico em vez de excluir o registro.
- Índices `[userId, status]` e `[status]` cobrem, respectivamente, a consulta de conexões de um usuário por status e o job de reconciliação/tela "Conexões" que varre conexões por status globalmente.

## 5. Justificativa de Modelagem

Referenciada na seção 5.4 do documento original ("Soft-delete seletivo"): "`OpenFinanceConnection.revokedAt` — obrigatório por `00-DECISIONS §2` ('marca a conexão como REVOKED... mantém histórico de transações já importadas')."

O desenho de `OpenFinanceConnection` pertencer sempre a um `User` (nunca a uma `Family`) é a base do modelo de isolamento por dono descrito na seção 3 de [../00-overview.md](../00-overview.md) e é o que exige a existência de [sharing-permission.md](sharing-permission.md) como camada separada para o compartilhamento posterior de contas/cartões derivados dessa conexão.
