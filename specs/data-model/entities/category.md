# Entidade: `Category`

> Parte de [../00-overview.md](../00-overview.md) · Schema completo em [../schema.prisma](../schema.prisma)

## 1. Trecho do Schema Prisma

```prisma
/// Categoria de despesa/receita. Categorias globais (default do sistema, ownerId nulo)
/// coexistem com categorias customizadas por usuário.
model Category {
  id        String   @id @default(uuid())
  ownerId   String?  // nulo = categoria padrão do sistema (seed)
  name      String
  icon      String?
  color     String?
  isIncome  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner              User?               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  transactions       Transaction[]
  recurringExpenses  RecurringExpense[]
  sharingPermissions SharingPermission[] @relation("CategorySharing")

  @@unique([ownerId, name])
  @@index([ownerId])
}
```

## 2. Explicação dos Campos

| Campo | Tipo | Explicação |
|---|---|---|
| `id` | `String` (PK, `uuid()`) | Identificador único da categoria. |
| `ownerId` | `String?` (FK) | Dono da categoria; `null` significa categoria padrão do sistema (criada via seed), disponível globalmente para todos os usuários. |
| `name` | `String` | Nome da categoria (ex.: "Supermercado", "Salário"). |
| `icon` | `String?` | Identificador do ícone exibido na UI. |
| `color` | `String?` | Cor associada à categoria na UI. |
| `isIncome` | `Boolean` (default `false`) | Indica se a categoria representa receita (`true`) ou despesa (`false`). |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente a cada alteração. |

## 3. Relações

- `owner` → [user.md](user.md): dono da categoria customizada; ausente (`null`) para categorias globais de sistema.
- `transactions` → [transaction.md](transaction.md): transações classificadas nesta categoria.
- `recurringExpenses` → [recurring-expense.md](recurring-expense.md): despesas recorrentes classificadas nesta categoria.
- `sharingPermissions` (relação nomeada `"CategorySharing"`) → [sharing-permission.md](sharing-permission.md): permissões de compartilhamento concedidas sobre esta categoria especificamente (compartilhar uma categoria mostra apenas consolidado, nunca detalhe transação-a-transação — ver [sharing-permission.md](sharing-permission.md)).

## 4. Regras de Negócio

- Constraint `@@unique([ownerId, name])`: um mesmo usuário (ou o conjunto de categorias globais, `ownerId = null`) não pode ter duas categorias com o mesmo nome.
- Categorias com `ownerId = null` são globais/padrão do sistema, criadas via seed (`prisma/seed.ts`) e compartilhadas implicitamente por todos os usuários — não exigem `SharingPermission`.
- Categorias customizadas são sempre por usuário, nunca por família: não existe uma entidade "categoria da família"; se dois membros quiserem a mesma categoria customizada, cada um cria a sua própria linha (suposição A4).
- Não possui soft-delete próprio, pois categorias de sistema nunca são removidas diretamente pelo usuário; categorias customizadas seguem cascade a partir da exclusão do `User` (`onDelete: Cascade`).

## 5. Justificativa de Modelagem

Da suposição A4 (seção 7 do documento original):

> Categorias padrão do sistema são globais (`ownerId = null`) e compartilhadas por todos os usuários; categorias customizadas são por usuário, não por família. Não há uma entidade "categoria da família" — se dois membros quiserem a mesma categoria customizada, cada um cria a sua. Simplifica o modelo; pode ser revisitado se o produto quiser categorias colaborativas por família no futuro.

Da seção 5.4 ("Soft-delete seletivo"): "`Transaction`, `Category` (do sistema) e `Institution` não têm soft-delete próprio porque nunca são removidas diretamente pelo usuário nesta versão do modelo — são removidas em cascata quando a entidade pai (`Account`/`Card`) é de fato excluída (o que só ocorre no fluxo de exclusão total de conta de usuário, não no 'arquivar/desconectar' do dia a dia)."

A limitação de `allowFullDetail` não se aplicar a `CATEGORY` (ver [sharing-permission.md](sharing-permission.md)) é uma regra de negócio específica de como categorias são compartilhadas: "categoria compartilhada sempre mostra apenas consolidado por categoria" (seção 2 do documento original, comentário do campo `SharingPermission.allowFullDetail`).
