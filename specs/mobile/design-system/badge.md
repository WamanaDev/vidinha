# Badge

`apps/mobile/src/components/Badge/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: rótulo curto de status/categoria (ex.: status de conexão Open Finance, papel do membro — ADMIN/MEMBER, categoria de transação). `tone` define a cor semântica.

```typescript
interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}
```
