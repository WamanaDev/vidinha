# Compartilhamento

## Visão geral

**Rota:** `/(app)/sharing` (`apps/mobile/app/(app)/sharing/index.tsx`)

**Query/Mutation GraphQL:** `sharingPermissions(familyId: ID!)`.

**Estados:** loading, empty (nada compartilhado ainda), error.

## Conta

**Rota:** `/(app)/sharing/account/[id]` (`apps/mobile/app/(app)/sharing/account/[id].tsx`)

**Query/Mutation GraphQL:** `updateSharingPermission` (ou `updateAccountSharing` diretamente — ver Suposição #2 em [`../../00-overview.md`](../../00-overview.md#suposições-desta-spec)).

**Estados:** loading, error.

## Cartão

**Rota:** `/(app)/sharing/card/[id]` (`apps/mobile/app/(app)/sharing/card/[id].tsx`)

**Query/Mutation GraphQL:** `updateCardSharing`.

**Estados:** loading, error.

## Categoria

**Rota:** `/(app)/sharing/category/[id]` (`apps/mobile/app/(app)/sharing/category/[id].tsx`)

**Query/Mutation GraphQL:** `updateCategory(input: { hiddenFromFamily })`.

**Estados:** loading, error.

---

Suposição #2 (SDL): o SDL expõe `updateAccountSharing`/`updateCardSharing` (mutations diretas) **e** `updateSharingPermission` (via `SharingPermission`). As telas `sharing/account/[id]` e `sharing/card/[id]` usam as mutations diretas por serem mais simples e específicas; `sharing/index.tsx` (visão geral) lista via `sharingPermissions(familyId)` e permite editar via `updateSharingPermission` quando o usuário navega a partir da visão consolidada. Ambos os caminhos escrevem o mesmo estado no backend.

Nota: não há código de exemplo completo para estas telas no documento original. Seguir os padrões de código de [`../auth/login.md`](../auth/login.md) e [`../tabs/transactions.md`](../tabs/transactions.md).
