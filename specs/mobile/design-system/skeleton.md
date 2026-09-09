# Skeleton

`apps/mobile/src/components/Skeleton/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: placeholder de carregamento (estado `loading` de qualquer `useQuery`/`useInfiniteQuery`). `count` permite repetir N placeholders para simular uma lista carregando.

```typescript
interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  count?: number;                       // repete N placeholders (listas)
}
```
