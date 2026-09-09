# Vidinha — Modelo de Dados (v1) — Visão Geral

**Status:** Especificação técnica derivada de `claude.md` (visão do produto) e `specs/00-DECISIONS.md` (decisões de arquitetura). Este documento (e a árvore `specs/data-model/`) é a fonte da verdade para o `schema.prisma` real do projeto.

**Pré-requisitos lidos:** `claude.md`, `specs/00-DECISIONS.md`. Nenhuma decisão de produto documentada nesses arquivos foi contrariada aqui. Onde uma decisão de modelagem não estava coberta, a suposição é declarada explicitamente na seção 7.

**Origem deste documento:** este conteúdo era, originalmente, um único arquivo (`specs/01-DATA-MODEL.md`). Ele foi reestruturado em uma árvore de arquivos (esta reorganização não alterou nenhuma decisão técnica, apenas a organização do conteúdo):

- Este arquivo (`00-overview.md`): diagrama conceitual, isolamento multi-tenant, estratégia de migração/ambientes e índice de entidades.
- `schema.prisma` (nesta mesma pasta): o schema Prisma completo e literal — fonte única de verdade do schema.
- `entities/*.md`: um arquivo por model, com o trecho do schema, explicação campo a campo, relações e regras de negócio específicas.

---

## 1. Diagrama Conceitual

```text
┌──────────┐        ┌────────────────┐        ┌──────────┐
│  User    │───1:N──│  FamilyMember  │──N:1───│  Family  │
│ (Supabase│        │  role: ADMIN/  │        │          │
│  Auth)   │        │       MEMBER   │        └────┬─────┘
└────┬─────┘        └────────────────┘             │
     │                                              │ 1:N
     │ 1:N (owner)                                  ▼
     │                                        ┌──────────────┐
     │                                        │ FamilyInvite │
     │                                        └──────────────┘
     │
     ├────────────────────────────────────────────────────────┐
     │                                                         │
     ▼                                                         ▼
┌───────────────────────┐                              ┌──────────────┐
│ OpenFinanceConnection  │──1:N──▶┌─────────┐           │RecurringExpense│
│ (Pluggy item/consent)  │        │ Account │           │ (manual, sem   │
│ status: ..., REVOKED   │        └────┬────┘           │  Open Finance) │
└──────────┬─────────────┘             │                └───────┬───────┘
           │                            │ 1:N                    │ N:1
           │ N:1                        ▼                        ▼
           │                      ┌───────────┐            ┌───────────┐
           │                ┌────▶│Transaction│◀───────────│ Category  │
           │                │     │hiddenFrom-│    N:1      └───────────┘
           │                │     │Family flag│
           │                │     └───────────┘
           │                │ 1:N       ▲
           ▼                │           │ N:1
    ┌─────────────┐         │           │
    │ Institution │         │     ┌──────────┐
    │ (Pluggy     │         └────▶│  Card    │───N:1──▶ Account (fatura)
    │  connector) │  1:N          └──────────┘
    └─────────────┘

┌─────────────────────┐        ┌──────────┐
│  SharingPermission   │──N:1──▶│  Family  │
│ ownerId, resourceType│        └──────────┘
│ (ACCOUNT/CARD/       │
│  CATEGORY),          │
│ resourceId,          │
│ allowFullDetail bool │
└──────────────────────┘

┌──────────┐
│ AuditLog │  (actorId → User, familyId opcional, action, metadata JSON)
└──────────┘
```

**Leitura do diagrama:**

- `User` é o registro espelho do usuário autenticado via **Supabase Auth** (id = `sub` do JWT). Ver [entities/user.md](entities/user.md).
- `Family` agrega N `FamilyMember` (papel `ADMIN`/`MEMBER`), conforme decidido em `00-DECISIONS.md §1`. Ver [entities/family.md](entities/family.md) e [entities/family-member.md](entities/family-member.md).
- `OpenFinanceConnection` pertence a um `User` (nunca a uma família diretamente — o compartilhamento é feito depois, via `SharingPermission`), representa um "item" Pluggy e agrega `Account`s. Ver [entities/open-finance-connection.md](entities/open-finance-connection.md).
- `Account` e `Card` pertencem sempre a um `User` (owner). Um `Card` referencia opcionalmente uma `Account` (conta de fatura/débito associada), mas é modelado como entidade própria (ver justificativa em [entities/account.md](entities/account.md) e [entities/card.md](entities/card.md)).
- `Transaction` pertence a uma `Account` **ou** a um `Card` (nunca ambos), tem `Category` opcional e a flag `hiddenFromFamily`. Ver [entities/transaction.md](entities/transaction.md).
- `RecurringExpense` é cadastro manual (aluguel, condomínio, internet etc.), desacoplado de Open Finance — pertence a um `User` (criador) e a uma `Family`. Ver [entities/recurring-expense.md](entities/recurring-expense.md).
- `SharingPermission` é a entidade que liga um recurso (`Account`, `Card` ou `Category`) de um `User` a uma `Family`, com granularidade e flag de detalhe completo. Ver [entities/sharing-permission.md](entities/sharing-permission.md).
- `AuditLog` registra eventos sensíveis, referenciando o ator e, quando aplicável, a família afetada. Ver [entities/audit-log.md](entities/audit-log.md).

---

## 2. Schema Prisma

O schema Prisma completo (todos os enums e models, literal) vive em [`schema.prisma`](schema.prisma), nesta mesma pasta — é a fonte única de verdade. Os arquivos em `entities/` reproduzem e explicam o trecho de cada model individualmente, mas qualquer divergência deve ser resolvida a favor de `schema.prisma`.

> **Nota sobre a FK polimórfica de `SharingPermission`:** Prisma não suporta FKs polimórficas nativamente. A modelagem usa três relações opcionais (`account`, `card`, `category`) todas apontando para a mesma coluna `resourceId`, o que o Postgres permite (múltiplas FKs "soft" não são impostas simultaneamente como constraint — na prática, a constraint de integridade referencial real deve ser reforçada por **um `CHECK` constraint via migration SQL manual** ou validação exclusiva na camada de serviço, já que o banco não consegue expressar "FK para uma de três tabelas" declarativamente). Documentado como suposição em `7.A2` (seção 7 abaixo) e detalhado em [entities/sharing-permission.md](entities/sharing-permission.md).

---

## 3. Isolamento Multi-Tenant e a Flag `hiddenFromFamily`

### 3.1 Isolamento por família/dono

Conforme `00-DECISIONS.md §4`, **nenhuma tabela sensível depende de Row Level Security (RLS) do Supabase como única barreira**. O isolamento é garantido em duas camadas redundantes (defesa em profundidade):

1. **Camada de dados:** toda entidade que representa um recurso financeiro individual (`Account`, `Card`, `Transaction` via `account`/`card`, `OpenFinanceConnection`, `RecurringExpense`, `SharingPermission`) carrega um `ownerId` (ou, no caso de `RecurringExpense`, `createdById` + `familyId`) que aponta para o `User` dono do dado. Não existe `familyId` direto em `Account`/`Card`/`Transaction` — a visibilidade por família é sempre **derivada** via `SharingPermission`, nunca atribuída diretamente à conta.
2. **Camada de aplicação (resolvers NestJS + CASL):** toda query GraphQL que retorna dados de terceiros (dados de outro membro da família) deve:
   - Confirmar que o usuário autenticado é membro ativo (`FamilyMember.removedAt IS NULL`) da `Family` em questão;
   - Buscar as `SharingPermission` ativas (`revokedAt IS NULL`) daquela família para os tipos de recurso relevantes;
   - Filtrar `Transaction`/`Account`/`Card` para incluir apenas os `resourceId`s presentes nas permissões concedidas;
   - Nunca aceitar `familyId` vindo do payload do cliente sem revalidar a associação do usuário autenticado a essa família.

Essa dupla camada evita que um bug de query (ex.: esquecer um `WHERE`) vaze dados entre famílias — mesmo que a query de banco retorne mais linhas do que deveria, o resolver filtra novamente por CASL antes de serializar a resposta.

### 3.2 Query de "transações compartilhadas visíveis para uma família"

Exemplo conceitual da query (pseudo-SQL) usada pelo resolver:

```sql
SELECT t.*
FROM "Transaction" t
LEFT JOIN "Account" a ON a.id = t."accountId"
LEFT JOIN "Card" c ON c.id = t."cardId"
JOIN "SharingPermission" sp ON (
  (sp."resourceType" = 'ACCOUNT' AND sp."resourceId" = a.id) OR
  (sp."resourceType" = 'CARD' AND sp."resourceId" = c.id)
)
WHERE sp."familyId" = $familyId
  AND sp."revokedAt" IS NULL
  AND t."hiddenFromFamily" = false
  AND t."occurredAt" BETWEEN $start AND $end
```

Os índices `Transaction(accountId, occurredAt)`, `Transaction(cardId, occurredAt)`, `Transaction(hiddenFromFamily)` e `SharingPermission(familyId, resourceType, revokedAt)` cobrem essa consulta sem full scan.

### 3.3 Flag `hiddenFromFamily`

- É um campo booleano **por transação**, independente do compartilhamento da conta/cartão.
- Comportamento: mesmo que uma `Account` esteja com `SharingPermission` ativa (com ou sem `allowFullDetail`) para uma família, qualquer `Transaction` com `hiddenFromFamily = true` é excluída de **toda e qualquer visão da família**, incluindo os totais consolidados por categoria — ou seja, não entra nem no extrato detalhado nem no somatório, dando ao dono controle real de ocultar um gasto específico (conforme `claude.md §5` item 11 e `00-DECISIONS §1`).
- Só o `ownerId` da conta/cartão dono da transação pode alterar essa flag; a alteração é um evento auditado (`AuditAction.TRANSACTION_HIDDEN_TOGGLED`, ver seção 9 de `00-DECISIONS.md`, embora esse action específico tenha sido acrescentado aqui como extensão natural da lista — ver suposição `7.A3`).
- Transações sem `hiddenFromFamily` (valor padrão `false`) seguem a regra normal de `SharingPermission.allowFullDetail`: se `false`, a transação entra apenas no agregado consolidado por categoria/mês exibido à família, nunca linha a linha.

Detalhes de campo estão em [entities/transaction.md](entities/transaction.md) e [entities/sharing-permission.md](entities/sharing-permission.md).

---

## 4. Estratégia de Migração e Ambientes

### 4.1 Prisma Migrate

- Ferramenta: **Prisma Migrate** (`prisma migrate dev` em desenvolvimento, `prisma migrate deploy` em staging/produção — nunca `db push` fora do ambiente local de prototipagem).
- Toda migration gerada é versionada no repositório em `prisma/migrations/`, com nome descritivo (`prisma migrate dev --name add_sharing_permission`).
- Migrations destrutivas (`DROP COLUMN`, mudança de tipo incompatível) exigem revisão manual do SQL gerado antes do merge — o Prisma às vezes propõe `DROP + CREATE` quando uma alteração aditiva seria suficiente.
- A constraint polimórfica de `SharingPermission.resourceId` (seção 2, nota final) deve ser reforçada por uma migration SQL manual (`ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)`) editada após o `prisma migrate dev`, já que o Prisma Schema Language não expressa essa regra.
- Seeds (`prisma/seed.ts`): categorias padrão do sistema (`Category` com `ownerId = null`) e catálogo inicial de `Institution` (sincronizado periodicamente com o catálogo de connectors do Pluggy via job, não apenas no seed inicial).

### 4.2 Ambientes

Alinhado a `00-DECISIONS.md §4/§7`:

| Ambiente | Banco | Como aplicar migrations |
|---|---|---|
| **Development** | Postgres local via Docker (ou branch/projeto Supabase de desenvolvimento pessoal) | `prisma migrate dev` (gera e aplica migration, atualiza client) |
| **Staging** | 2º projeto Supabase Free, atrelado ao ambiente de Preview da Vercel | `prisma migrate deploy` executado no pipeline de CI/CD (GitHub Actions) antes do deploy da função serverless |
| **Production** | Projeto Supabase Free principal | `prisma migrate deploy` executado no pipeline de CI/CD, com gate manual de aprovação (branch `main` protegida) antes do deploy final |

- Nenhum ambiente de desenvolvimento usa dump/snapshot de dados de produção (dado real de usuários), conforme `claude.md §48`. Dados de desenvolvimento vêm do seed + sandbox Pluggy (dados fictícios do provedor).
- `DATABASE_URL` de cada ambiente é um secret distinto gerenciado no GitHub Actions/Vercel (nunca committado — ver `claude.md §47`).
- Como o Supabase Free não oferece backup gerenciado (`00-DECISIONS §4`), o job semanal de `pg_dump` (GitHub Actions → Cloudflare R2) roda **apenas contra o projeto de produção**; staging não precisa de backup (dados não críticos, recriáveis via seed).

---

## 5. Índice de Entidades

Cada model do schema tem seu próprio arquivo em `entities/`, contendo: o trecho do `schema.prisma`, explicação campo a campo, relações com outras entidades e regras de negócio/justificativas específicas.

| Entidade | Arquivo |
|---|---|
| `User` | [entities/user.md](entities/user.md) |
| `Family` | [entities/family.md](entities/family.md) |
| `FamilyMember` | [entities/family-member.md](entities/family-member.md) |
| `FamilyInvite` | [entities/family-invite.md](entities/family-invite.md) |
| `Institution` | [entities/institution.md](entities/institution.md) |
| `OpenFinanceConnection` | [entities/open-finance-connection.md](entities/open-finance-connection.md) |
| `Account` | [entities/account.md](entities/account.md) |
| `Card` | [entities/card.md](entities/card.md) |
| `Category` | [entities/category.md](entities/category.md) |
| `Transaction` | [entities/transaction.md](entities/transaction.md) |
| `SharingPermission` | [entities/sharing-permission.md](entities/sharing-permission.md) |
| `RecurringExpense` | [entities/recurring-expense.md](entities/recurring-expense.md) |
| `AuditLog` | [entities/audit-log.md](entities/audit-log.md) |

---

## 6. Índices e Queries Cobertas

Resumo das queries de leitura mais frequentes previstas no MVP e o índice que as atende:

| Query | Índice |
|---|---|
| Extrato de uma conta em um intervalo de datas | `Transaction(accountId, occurredAt)` |
| Fatura de um cartão em um intervalo de datas | `Transaction(cardId, occurredAt)` |
| Totais por categoria em um período (relatório mensal) | `Transaction(categoryId, occurredAt)` |
| Deduplicação de transação já importada do Pluggy | `Transaction(externalId, accountId, cardId)` único |
| Transações visíveis/compartilhadas com a família (excluindo ocultas) | `Transaction(hiddenFromFamily)` + `SharingPermission(familyId, resourceType, revokedAt)` |
| Contas/cartões ativos de um usuário | `Account(ownerId, archivedAt)`, `Card(ownerId, archivedAt)` |
| Conexões Open Finance por status (job de reconciliação, tela "Conexões") | `OpenFinanceConnection(userId, status)`, `OpenFinanceConnection(status)` |
| Membros ativos de uma família por papel | `FamilyMember(familyId, role)` |
| Despesas recorrentes ativas de uma família | `RecurringExpense(familyId, isActive)` |
| Log de auditoria por ator/família/tipo de evento | `AuditLog(actorId, createdAt)`, `AuditLog(familyId, createdAt)`, `AuditLog(action, createdAt)` |

---

## 7. Suposições desta Spec

Pontos não cobertos explicitamente em `00-DECISIONS.md`, resolvidos aqui com a decisão mais simples possível:

- **A1 — `RecurringExpense` sempre pertence a uma família (`familyId` obrigatório, não opcional).** `00-DECISIONS.md` não define se uma despesa recorrente pode ser puramente pessoal (sem família). Como o próprio `claude.md` já lista "contas recorrentes" (aluguel, condomínio etc.) como exemplo central de despesa *compartilhada*, assumimos que todo `RecurringExpense` é criado no contexto de uma família (o `createdById` identifica quem cadastrou, mas o compromisso em si é sempre visível a todos os membros da família, sem granularidade de compartilhamento adicional — diferente de `Account`/`Card`/`Category`, que exigem opt-in via `SharingPermission`). Caso o produto queira despesas recorrentes puramente pessoais no futuro, basta tornar `familyId` opcional. Ver [entities/recurring-expense.md](entities/recurring-expense.md).
- **A2 — Integridade referencial polimórfica de `SharingPermission.resourceId` é reforçada na camada de serviço + `CHECK` constraint manual, não nativamente pelo Prisma.** O Prisma Schema Language não suporta FK polimórfica; a alternativa (uma tabela de junção por tipo de recurso) foi descartada por adicionar complexidade sem benefício real no volume de dados esperado no MVP. Ver [entities/sharing-permission.md](entities/sharing-permission.md).
- **A3 — `AuditAction.TRANSACTION_HIDDEN_TOGGLED` foi adicionado à lista de eventos auditáveis.** `00-DECISIONS §9` lista os eventos obrigatórios mas não menciona explicitamente a alternância de `hiddenFromFamily`; como essa ação tem impacto direto sobre o que a família vê (afeta transparência financeira compartilhada), foi tratada como extensão natural e de baixo risco da lista existente, não como uma nova política. Ver [entities/audit-log.md](entities/audit-log.md) e [entities/transaction.md](entities/transaction.md).
- **A4 — Categorias padrão do sistema são globais (`ownerId = null`) e compartilhadas por todos os usuários; categorias customizadas são por usuário, não por família.** Não há uma entidade "categoria da família" — se dois membros quiserem a mesma categoria customizada, cada um cria a sua. Simplifica o modelo; pode ser revisitado se o produto quiser categorias colaborativas por família no futuro. Ver [entities/category.md](entities/category.md).
- **A5 — `Card.billingAccountId` é opcional.** Assumido porque nem todo cartão (especialmente cartões de crédito "avulsos" retornados pelo Pluggy) tem uma conta de débito automático identificável no MVP. Ver [entities/card.md](entities/card.md).
- **A6 — Moeda fixa em `BRL`** (`Account.currency` existe como campo mas com default único) — o produto é voltado ao mercado brasileiro (Open Finance BR/Pluggy) e não há indicação de suporte multi-moeda no MVP; o campo foi mantido para não exigir migration futura caso isso mude. Ver [entities/account.md](entities/account.md).
