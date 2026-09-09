# Button

`apps/mobile/src/components/Button/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: ação primária/secundária em formulários e telas (ex.: "Entrar", "Salvar", "Excluir conta"). `variant="destructive"` para ações irreversíveis (ex.: excluir conta, remover membro). `loading` deve ser usado durante qualquer chamada assíncrona (login, mutations) para evitar duplo submit.

```typescript
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```
