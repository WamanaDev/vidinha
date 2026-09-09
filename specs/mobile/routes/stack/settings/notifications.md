# Configurações — Notificações

**Rota:** `/(app)/settings/notifications` (`apps/mobile/app/(app)/settings/notifications.tsx`)

**Query/Mutation GraphQL:** local (Suposição #3 em [`../../../00-overview.md`](../../../00-overview.md#suposições-desta-spec) — sem mutation dedicada no SDL atual).

**Estados:** loading, error.

Não há mutation/tipo `NotificationPreferences` no SDL de `02-API-AUTH.md`. Esta tela é especificada como **placeholder de UI** com estado local (Zustand/SecureStore), sem persistência no backend, até que o schema seja estendido — sinalizado para o time de API.

Nota: não há código de exemplo completo para esta tela no documento original. Seguir os padrões de código de [`../../auth/login.md`](../../auth/login.md) e [`../../tabs/transactions.md`](../../tabs/transactions.md).
