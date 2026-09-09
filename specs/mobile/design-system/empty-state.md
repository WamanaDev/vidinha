# EmptyState

`apps/mobile/src/components/EmptyState/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: exibido quando uma query retorna lista vazia (nenhuma conta conectada, nenhum lançamento no filtro, etc.). `actionLabel`/`onAction` normalmente disparam a ação que resolveria o estado vazio (ex.: "Conectar instituição").

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
```
