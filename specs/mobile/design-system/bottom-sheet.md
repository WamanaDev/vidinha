# BottomSheet

`apps/mobile/src/components/BottomSheet/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: painel inferior modal para filtros (ex.: `TransactionFilterSheet`), seleção de opções, ou confirmações que não justificam uma rota `(modals)` própria.

```typescript
interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];     // ex.: ['25%', '50%']
  children: React.ReactNode;
}
```
