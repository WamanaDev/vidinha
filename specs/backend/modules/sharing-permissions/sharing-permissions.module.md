# Módulo `sharing-permissions` — Contrato e regras de negócio

**Status:** Contrato GraphQL extraído de `specs/02-API-AUTH.md §3.6`. Sem código de exemplo ainda — **seguir o padrão de código do módulo `family` em `backend/modules/family/`** (estrutura de arquivos, DTOs com `class-validator`, mapeamento explícito Prisma → entity, `@CheckAbility()`/`PoliciesGuard`, testes `.spec.ts` ao lado do arquivo testado). Ver [`../family/family.module.md`](../family/family.module.md) para o exemplo completo e [`../../00-overview.md`](../../00-overview.md) para o índice geral.

---

## 1. Contrato GraphQL (SDL)

```graphql
enum SharingScope {
  ACCOUNT
  CARD
  CATEGORY
}

type SharingPermission implements Node {
  id: ID!
  family: Family!
  owner: User!
  scope: SharingScope!
  targetId: ID! # id da Account, Card ou Category conforme `scope`
  sharedWithFamily: Boolean!
  fullDetailShared: Boolean!
  updatedAt: DateTime!
}

input UpdateSharingPermissionInput {
  id: ID!
  sharedWithFamily: Boolean
  fullDetailShared: Boolean
}

type Query {
  sharingPermissions(familyId: ID!): [SharingPermission!]!
}

type Mutation {
  updateSharingPermission(input: UpdateSharingPermissionInput!): SharingPermission!
}
```

## 2. Regras de negócio (extraídas de `00-DECISIONS.md §1` e `specs/02-API-AUTH.md §2.2`)

- Este módulo é a **fonte central de verdade de compartilhamento**: `Account.sharedWithFamily`/`fullDetailShared` e `Card.sharedWithFamily` (ver [`../accounts/accounts.module.md`](../accounts/accounts.module.md), [`../cards/cards.module.md`](../cards/cards.module.md)) são espelhos denormalizados desta entidade, indexados por `scope` + `targetId`. Implementar `accounts`/`cards` reutilizando (ou sincronizando com) o registro `SharingPermission` correspondente evita duas fontes de verdade divergentes.
- Granularidade do compartilhamento: por **conta** (`ACCOUNT`), por **cartão** (`CARD`) e por **categoria de despesa** (`CATEGORY`). Não há compartilhamento "tudo ou nada" — cada `SharingPermission` cobre exatamente um recurso (`targetId`).
- Compartilhamento é **sempre opt-in**, nunca automático (`00-DECISIONS.md §1`) — todo `SharingPermission` novo nasce com `sharedWithFamily: false`.
- **Regra ABAC central (já modelada no `AbilityFactory` de referência):** um `MEMBER` só edita a própria `SharingPermission` (`ownerId === userId`); tentar editar a de outro membro é `FORBIDDEN` — ver exemplo completo em [`../../common/casl-ability-factory.md §2`](../../common/casl-ability-factory.md), Regra 1 (`can(Action.Update, 'SharingPermission', { ownerId: userId })` / `cannot(...)` para os demais).
- `ADMIN` tem `Action.Read` sobre todas as `SharingPermission` da família (visibilidade administrativa), mas **não pode editar** a permissão de outro membro — só o dono decide o que compartilha.
- `fullDetailShared: true` sem `sharedWithFamily: true` não deve ser um estado permitido/relevante na prática — validar no service que o detalhe completo só se aplica quando o recurso já está compartilhado (a UI deve refletir essa dependência, mas o backend deve ser a garantia final, "nunca confiar diretamente nos dados recebidos do cliente", `CLAUDE.md §28`).
- Alteração de `SharingPermission` é evento obrigatoriamente auditado (`00-DECISIONS.md §9`: "mudança de permissão de compartilhamento") — ver [`../audit-log/audit-log.module.md`](../audit-log/audit-log.module.md).
- Nível de isolamento de transação **`Serializable`** é exigido especificamente para mutações que alteram permissão de compartilhamento (`00-DECISIONS.md §4`), para evitar condições de corrida entre leituras concorrentes de consolidação familiar e a atualização da permissão.

## 3. Estrutura de arquivos esperada (seguindo o padrão `family`)

```text
apps/api/src/modules/sharing-permissions/
├── sharing-permissions.module.ts
├── sharing-permissions.resolver.ts
├── sharing-permissions.service.ts
├── sharing-permissions.service.spec.ts
├── dto/
│   └── update-sharing-permission.input.ts
└── entities/
    └── sharing-permission.entity.ts
```

## Nota de implementação

Este módulo ainda não tem código de exemplo escrito. Ao implementá-lo, seguir exatamente a estrutura de `apps/api/src/modules/family/` (module/resolver/service/dto/entities, `.spec.ts` ao lado do service, mapeamento explícito de Prisma para GraphQL ObjectType, `@CheckAbility()` para autorização, exceções tipadas de `@common/errors/app.exceptions`) — ver [`../family/family.module.md`](../family/family.module.md). É pré-requisito para `accounts`/`cards`/`transactions` — ver ordem de implementação em [`../../00-overview.md §3`](../../00-overview.md).
