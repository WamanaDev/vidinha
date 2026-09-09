# Card

`apps/mobile/src/components/Card/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: contêiner de conteúdo agrupado (resumo do dashboard, item de conta/cartão quando não é lista simples). Quando `onPress` é fornecido, o componente vira um `Pressable` internamente (feedback tátil de toque).

```typescript
interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;                 // se presente, vira Pressable
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 'none' | 'low' | 'medium';
}
```
