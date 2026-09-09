# Entidade: `SharingPermission`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Concede visibilidade de um recurso (conta, cartão ou categoria) de um
/// usuário para uma família. Entidade própria — ver justificativa na seção 6.
model SharingPermission {
  id           String               @id @default(uuid())
  ownerId      String
  familyId     String
  resourceType SharableResourceType
  /// FK polimórfica lógica: aponta para Account.id, Card.id ou Category.id,
  /// conforme resourceType. Validado na camada de serviço (Prisma não modela
  /// FK polimórfica nativamente) e reforçado pelas relações opcionais abaixo
  /// para permitir joins/índices diretos por tipo.
  resourceId   String
  /// Quando true, a família vê o extrato transação-a-transação; quando false,
  /// apenas totais consolidados (ver seção 3). Não se aplica a CATEGORY
  /// (categoria compartilhada sempre mostra apenas consolidado por categoria).
  allowFullDetail Boolean @default(false)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  /// Soft-delete: revogação de compartilhamento mantém histórico para auditoria.
  revokedAt    DateTime?

  owner  User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)

  // Relações opcionais só para permitir join direto quando resourceType bate;
  // populadas/mantidas em sincronia pela camada de serviço.
  account  Account?  @relation("AccountSharing", fields: [resourceId], references: [id], map: "sharing_account_fk")
  card     Card?     @relation("CardSharing", fields: [resourceId], references: [id], map: "sharing_card_fk")
  category Category? @relation("CategorySharing", fields: [resourceId], references: [id], map: "sharing_category_fk")

  @@unique([ownerId, familyId, resourceType, resourceId])
  @@index([familyId, resourceType, revokedAt])
  @@index([ownerId])
}
```

Enum usado:

```prisma
enum SharableResourceType {
  ACCOUNT
  CARD
  CATEGORY
}
```

> **Nota sobre a FK polimórfica:** Prisma não suporta FKs polimórficas nativamente. A modelagem usa três relações opcionais (`account`, `card`, `category`) todas apontando para a mesma coluna `resourceId`, o que o Postgres permite (múltiplas FKs "soft" não são impostas simultaneamente como constraint — na prática, a constraint de integridade referencial real deve ser reforçada por **um `CHECK` constraint via migration SQL manual** ou validação exclusiva na camada de serviço, já que o banco não consegue expressar "FK para uma de três tabelas" declarativamente).

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da permissão. |
| `ownerId` | `String` (FK) | Usuário dono do recurso compartilhado. |
| `familyId` | `String` (FK) | Família com a qual o recurso é compartilhado. |
| `resourceType` | `SharableResourceType` | Tipo do recurso: `ACCOUNT`, `CARD` ou `CATEGORY`. |
| `resourceId` | `String` | FK polimórfica lógica — aponta para `Account.id`, `Card.id` ou `Category.id`, conforme `resourceType`. Validada na camada de serviço. |
| `allowFullDetail` | `Boolean` (default `false`) | Quando `true`, a família vê o extrato transação-a-transação do recurso; quando `false`, apenas totais consolidados. Não se aplica a `CATEGORY` (categoria compartilhada sempre mostra apenas consolidado). |
| `createdAt` | `DateTime` | Data de criação da permissão. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |
| `revokedAt` | `DateTime?` | Soft-delete: preenchido quando a permissão é revogada, preservando histórico para auditoria. |

## 3. Relações

- `owner` → [user.md](user.md): usuário dono do recurso (`onDelete: Cascade`).
- `family` → [family.md](family.md): família beneficiária do compartilhamento (`onDelete: Cascade`).
- `account` (relação nomeada `"AccountSharing"`) → [account.md](account.md): populada quando `resourceType = ACCOUNT`.
- `card` (relação nomeada `"CardSharing"`) → [card.md](card.md): populada quando `resourceType = CARD`.
- `category` (relação nomeada `"CategorySharing"`) → [category.md](category.md): populada quando `resourceType = CATEGORY`.

## 4. Regras de Negócio

- **Granularidade conta/cartão/categoria:** um usuário escolhe compartilhar recursos individualmente — uma conta, um cartão ou uma categoria — cada combinação (dono + família + tipo + recurso) é uma linha própria (`@@unique([ownerId, familyId, resourceType, resourceId])`), permitindo que o mesmo usuário compartilhe recursos diferentes com famílias diferentes.
- **Flag `allowFullDetail`:** controla se a família vê o extrato transação-a-transação (`true`) ou apenas totais consolidados (`false`) para aquele recurso. **Não se aplica a `CATEGORY`** — categoria compartilhada sempre mostra apenas consolidado por categoria, nunca o detalhe de cada transação.
- Mesmo com `allowFullDetail = true`, transações individuais marcadas com `Transaction.hiddenFromFamily = true` continuam excluídas de toda visão da família (ver [transaction.md](transaction.md)).
- `revokedAt` preserva o histórico de "quem teve acesso a quê e até quando" para fins de auditoria — a revogação nunca apaga a linha.
- Índice `[familyId, resourceType, revokedAt]` é o índice central da query de "recursos visíveis para uma família" (ver seção 3.2 de [../00-overview.md](../00-overview.md)).
- A integridade referencial da FK polimórfica (`resourceId`) deve ser reforçada por um `CHECK` constraint via migration SQL manual, além da validação na camada de serviço — não é garantida nativamente pelo Prisma (suposição A2, seção 7 de [../00-overview.md](../00-overview.md)).

## 5. Justificativa de Modelagem

Da seção 5.2 do documento original ("`SharingPermission` como entidade própria (não um booleano em `Account`)"):

> Um campo booleano simples (`Account.sharedWithFamily: boolean`) não comportaria os requisitos já decididos:
> - Um usuário pode pertencer a **múltiplas famílias** (`00-DECISIONS §1`) — um booleano não diz *com qual* família o recurso está compartilhado; seria necessário uma FK única `familyId`, o que impediria compartilhar a mesma conta com duas famílias diferentes.
> - A flag `allowFullDetail` ("detalhe completo" vs. "apenas consolidado") é por **combinação de recurso + família**, não uma propriedade fixa da conta.
> - Precisamos de **histórico de revogação** (`revokedAt`) para auditoria (`claude.md §46`), o que um campo booleano sobrescrito não preserva.
> - A granularidade por **categoria** (não só conta/cartão) exigiria três booleanos espalhados em três tabelas diferentes, duplicando a lógica de concessão/revogação em vez de centralizá-la em uma tabela com `resourceType` + `resourceId`.
>
> Uma entidade própria também é o único jeito natural de responder "quais permissões esse usuário já concedeu, para quem, e quando" — uma tela de gerenciamento de privacidade... precisa listar exatamente essas linhas.

Da suposição A2 (seção 7): "Integridade referencial polimórfica de `SharingPermission.resourceId` é reforçada na camada de serviço + `CHECK` constraint manual, não nativamente pelo Prisma. O Prisma Schema Language não suporta FK polimórfica; a alternativa (uma tabela de junção por tipo de recurso) foi descartada por adicionar complexidade sem benefício real no volume de dados esperado no MVP."
