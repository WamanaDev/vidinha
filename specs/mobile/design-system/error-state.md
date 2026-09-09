# ErrorState

`apps/mobile/src/components/ErrorState/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: exibido quando uma query/mutation falha. `description` deve ser a mensagem já mapeada por `@lib/errorMapping.ts` a partir de `error.extensions.code` (nunca `debugMessage`/stack cru — `claude.md` §31, `02-API-AUTH.md` §4). `errorCode` só deve ser exibido em `__DEV__`.

```typescript
interface ErrorStateProps {
  title?: string;                       // default: "Algo deu errado"
  description?: string;                 // mensagem já mapeada por errorMapping.ts (nunca raw)
  onRetry?: () => void;
  errorCode?: string;                   // extensions.code, exibido só em dev (__DEV__)
}
```
