# ListItem

`apps/mobile/src/components/ListItem/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: linha padrão de listas (transações, contas, cartões, membros, categorias, recorrências). `leftElement` tipicamente recebe `Avatar` ou ícone de instituição; `rightElement` tipicamente recebe `Amount`, `Badge` ou chevron.

Performance (`claude.md` §16.1/§16.3): exportar como `React.memo(ListItem)` — ver nota de performance em [`../00-overview.md`](../00-overview.md#6-performance-mobile-aplicada) e exemplo concreto em [`../routes/tabs/transactions.md`](../routes/tabs/transactions.md).

```typescript
interface ListItemProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;        // Avatar, ícone de instituição, etc.
  rightElement?: React.ReactNode;       // Amount, Badge, chevron
  onPress?: () => void;
  disabled?: boolean;
}
```
