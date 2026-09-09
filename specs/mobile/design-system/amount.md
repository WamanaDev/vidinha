# Amount

`apps/mobile/src/components/Amount/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: exibição monetária com máscara BRL em qualquer lugar que mostre valores (transações, saldos, faturas). `value` é sempre a unidade decimal (reais), nunca centavos. `hideValue` é um modo de privacidade opcional (ver Suposição #6 em [`../00-overview.md`](../00-overview.md)).

```typescript
interface AmountProps {
  value: number;                        // sempre em unidade decimal (reais), nunca centavos
  currency?: string;                    // default 'BRL'
  variant?: 'default' | 'compact' | 'large';
  colorByValue?: boolean;               // positivo=verde, negativo=vermelho, quando aplicável
  hideValue?: boolean;                  // modo "privacidade" (mostra •••• em vez do valor)
}
```
