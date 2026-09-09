# TextInput

`apps/mobile/src/components/TextInput/index.tsx` — sem conhecimento de GraphQL/domínio.

Uso: campo de formulário com label e mensagem de erro de validação embutidas (login, cadastro, criação de família, categorias, etc.). `error` deve ser preenchido com mensagem já validada/sanitizada (nunca eco direto de erro de servidor não mapeado).

```typescript
interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;                       // mensagem de validação exibida abaixo
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  rightAdornment?: React.ReactNode;     // ex.: ícone "mostrar senha"
}
```
