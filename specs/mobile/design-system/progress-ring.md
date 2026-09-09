# ProgressRing

`apps/mobile/src/components/ProgressRing/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: indicador circular de progresso, ex.: % da fatura do cartão utilizada (`CardInvoiceProgress`), progresso de meta.

```typescript
interface ProgressRingProps {
  progress: number;                     // 0 a 1
  size?: number;
  strokeWidth?: number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  label?: string;                       // texto central, ex. "68%"
}
```
