# Estilo visual — Avatar

**Interface (props):** `specs/mobile/design-system/avatar.md`.

---

## 1. Tamanhos

| `size` | Diâmetro | Tipografia das iniciais | Borda | Uso |
|---|---|---|---|---|
| `xs` | 24dp | Inter 600 10/12 | nenhuma | Pilha de membros em cartão, inline em texto |
| `sm` | 32dp | Inter 600 12/14 | nenhuma | `ListItem.leftElement`, linha de membro |
| `md` | 40dp | Inter 600 15/18 | nenhuma | Header, cartão de membro |
| `lg` | 64dp | Inter 600 24/28 | 2dp `bg.surface` | Tela de perfil, cabeçalho de família |

- **Forma:** círculo (`borderRadius: size / 2`). Sem exceção.
- **Imagem:** `expo-image`, `contentFit="cover"`, `cachePolicy="disk"`, `transition={180}`.
- Iniciais: máximo **2 caracteres**, maiúsculas, derivadas de `displayName` (primeira letra do primeiro e do último nome). `numberOfLines={1}`, `allowFontScaling={false}` (a fonte não pode estourar o círculo).

---

## 2. Cores do fallback

O fundo do fallback é **determinístico por `fallbackInitials`** — a mesma pessoa tem sempre a mesma cor, em qualquer tela. Hash simples das iniciais → índice em uma paleta de 5 tons da marca.

### Light

| Índice | Fundo | Iniciais | Contraste |
|---|---|---|---|
| 0 | `#F6DDD4` (terracota-100) | `#54211A` (terracota-900) | 9.8:1 ✅ |
| 1 | `#EEF3EF` (manjericao-50) | `#1D4433` (manjericao-800) | 9.5:1 ✅ |
| 2 | `#FDF3DC` (manteiga-100) | `#8A5F10` (manteiga-700) | 5.6:1 ✅ |
| 3 | `#E8EEF2` (info-50) | `#3A6B8A` (info) | 5.1:1 ✅ |
| 4 | `#F2EBE1` (areia-100) | `#3A312C` (grafite-800) | 10.9:1 ✅ |

### Dark

| Índice | Fundo | Iniciais |
|---|---|---|
| 0 | `rgba(229,138,112,0.20)` | `#E58A70` |
| 1 | `rgba(127,191,156,0.20)` | `#7FBF9C` |
| 2 | `rgba(242,180,65,0.20)` | `#F2B441` |
| 3 | `rgba(143,182,206,0.20)` | `#8FB6CE` |
| 4 | `#2F2925` | `#F2EBE3` |

```ts
const idx = [...initials].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 5, 7);
```

**Sem gradiente, sem cor aleatória por render, sem cor derivada do e-mail** (o e-mail pode mudar; as iniciais não devem trocar de cor por isso).

---

## 3. Estados

| Estado | Tratamento |
|---|---|
| Carregando imagem | Fundo do fallback + iniciais já visíveis. **Nunca** skeleton cinza — a inicial é um placeholder melhor |
| Erro de load (`onError`) | Fica no fallback permanentemente nesta sessão |
| Sem `uri` | Fallback direto |
| Pressionável | Opacidade `0.85` em `onPressIn`, 100ms. Sem escala |
| Ausente / removido da família | Fallback índice 4 (neutro) com iniciais em `text.disabled` e opacidade `0.6` |

---

## 4. Pilha de avatares (membros da família)

Padrão para "quem está nesta família" em cartão de resumo:

- `size="xs"` (24dp), sobreposição de **−8dp** (`marginLeft: -8` a partir do segundo).
- Cada avatar ganha `borderWidth: 2`, `borderColor` = cor do fundo em que está (`bg.surface` em cartão, `bg.app` em tela) — é o que cria o recorte entre eles.
- Máximo **4 avatares visíveis**; o quinto vira um círculo `+N` com fundo `bg.surface-sunken` e texto em `text.secondary`, Inter 600 10/12.
- Ordem: quem organiza primeiro, depois por ordem alfabética.
- `accessibilityLabel` do grupo: "Ana, Rafa e mais 2 pessoas".

---

## 5. Indicador de papel (quem organiza)

Quando o avatar precisa sinalizar o papel de administrador, **nunca use cor sozinha**: adicione um `Badge tone="neutral"` com o texto "quem organiza" ao lado (nunca "admin" — `02-tone-of-voice.md` §6), ou um ponto de 8dp em `brand.primary` com borda 2dp da cor do fundo, no canto inferior direito, **acompanhado** de texto acessível.

Ponto de status de conexão (online/sincronizado) **não existe** no avatar — status é do banco, não da pessoa, e vive no `Badge` do cartão de conta.

---

## 6. Acessibilidade

- `accessibilityRole="image"`, `accessibilityLabel` = nome completo da pessoa (nunca só as iniciais).
- Avatar decorativo em pilha: o container recebe o label do grupo e os filhos ficam `accessibilityElementsHidden`.
- Iniciais com `allowFontScaling={false}` é a única exceção à regra de escala do app (`typography.md` §4) — justificada porque o container é circular e de tamanho fixo por definição, e a informação (o nome) está sempre disponível no label acessível e, na maioria dos contextos, também em texto ao lado.
- Contraste de todas as combinações de fallback auditado na §2 (mínimo 5.1:1).
