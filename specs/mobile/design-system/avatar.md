# Avatar

`apps/mobile/src/components/Avatar/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: identificação visual de usuário/membro da família (listas de membros, perfil). `fallbackInitials` deve ser derivado de `displayName` sempre que `uri` for nulo/falhar o load.

```typescript
interface AvatarProps {
  uri?: string | null;
  fallbackInitials: string;             // derivado de displayName
  size?: 'xs' | 'sm' | 'md' | 'lg';
}
```
