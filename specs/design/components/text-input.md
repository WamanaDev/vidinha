# Estilo visual — TextInput

**Interface (props):** `specs/mobile/design-system/text-input.md`.
**Tokens:** ver `../tokens/`.

---

## 1. Anatomia e geometria

```
label            Inter 500 13/18   text.secondary
  ↓ 6dp
[ campo ]        altura 52dp, raio 12dp
  ↓ 6dp
mensagem de erro Inter 400 12/16   state.error.fg   (+ ícone 16dp)
```

| Medida | Valor |
|---|---|
| Altura do campo | **52dp** (`minHeight`, nunca `height`) |
| Raio | `radius.sm` = **12dp** |
| `paddingHorizontal` | 16 (`space.4`) |
| `paddingVertical` | 14 (o texto centraliza; `minHeight` garante o resto ao escalar a fonte) |
| Gap label → campo | 6dp |
| Gap campo → erro/ajuda | 6dp |
| Gap entre dois campos do formulário | 24dp (`space.6`) — o bloco label+campo+erro é uma unidade |
| Borda | 1dp (2dp quando focado ou em erro) |
| `rightAdornment` | ícone 20dp, alvo 48×48 via `hitSlop`, 12dp da borda direita |

Texto digitado: `body` (Inter 400, 15/22). Placeholder: mesmo estilo, cor `text.disabled`.

**Sem floating label.** O label fica fixo acima do campo, sempre visível. Motivo: label flutuante desaparece no momento em que o usuário mais precisa dele (ao digitar) e quebra com fonte ampliada a 200%.

---

## 2. Cores por estado — Light

| Estado | Fundo | Borda | Texto | Label | Placeholder |
|---|---|---|---|---|---|
| default (vazio) | `#F2EBE1` | 1dp `#E5DCD0` | `#241E1A` | `#6E635C` | `#BCB0A2` |
| preenchido | `#F2EBE1` | 1dp `#E5DCD0` | `#241E1A` | `#6E635C` | — |
| **focado** | `#FFFFFF` | **2dp `#B04530`** | `#241E1A` | **`#8F3626`** | `#BCB0A2` |
| **erro** | `#F7E6E4` | 2dp `#B3261E` | `#241E1A` | `#B3261E` | `#BCB0A2` |
| erro + focado | `#FFFFFF` | 2dp `#B3261E` | `#241E1A` | `#B3261E` | `#BCB0A2` |
| disabled / readOnly | `#F2EBE1` | 1dp `#F2EBE1` | `#BCB0A2` | `#BCB0A2` | `#BCB0A2` |

O campo **afunda** em repouso (`areia-100`) e **sobe para branco** ao focar. É o gesto inverso do padrão de Material (que escurece ao focar) e é o que dá a sensação de "papel limpo" da marca.

## 3. Cores por estado — Dark

| Estado | Fundo | Borda | Texto | Label | Placeholder |
|---|---|---|---|---|---|
| default | `#191512` | 1dp `#3D352F` | `#F2EBE3` | `#B0A498` | `#6E635C` |
| **focado** | `#241F1B` | **2dp `#E58A70`** | `#F2EBE3` | `#E58A70` | `#6E635C` |
| **erro** | `rgba(242,184,181,0.10)` | 2dp `#F2B8B5` | `#F2EBE3` | `#F2B8B5` | `#6E635C` |
| disabled | `#191512` | 1dp `#2F2925` | `#6E635C` | `#6E635C` | `#6E635C` |

No dark o campo continua afundando (fundo = `bg.app`, mais escuro que o cartão) e sobe para `bg.surface` ao focar. Mesma lógica, cores invertidas.

---

## 4. Mensagem de erro

- Tipografia: `caption` (Inter 400 12/16), cor `state.error.fg` (`#B3261E` light / `#F2B8B5` dark).
- Precedida por ícone `AlertCircle` 14dp na mesma cor, gap 4dp — **cor nunca é o único portador** (`03-visual-identity.md` §7.2).
- Entra por **fade + expansão de altura**, 180ms `easing.standard`. **Nunca shake, nunca vibração** — a marca não repreende (`01-brand-strategy.md` §7).
- Microcopy: prestativa, diz como resolver, sem emoji, sem exclamação. "Esse e-mail parece incompleto — faltou o @?" e não "E-mail inválido!" (`02-tone-of-voice.md` §5).
- O erro **substitui** o texto de ajuda quando ambos existiriam; não empilha.
- Aparece em `onBlur` ou no submit — nunca a cada tecla digitada.

---

## 5. Variações de conteúdo

| Caso | Tratamento |
|---|---|
| Senha (`secureTextEntry`) | `rightAdornment` = `Eye`/`EyeOff` 20dp em `icon.muted`, alvo 48×48, `accessibilityLabel` "Mostrar senha"/"Ocultar senha" |
| Valor em R$ | Prefixo fixo "R$" em `text.secondary` à esquerda (16dp de padding, 8dp de gap), input com `keyboardType="numeric"`, texto em `amount` (Inter 600 tnum), alinhado à **direita** |
| Código MFA (6 dígitos) | 6 caixas de 48×56dp, raio 12, gap 8dp, texto `h3` centralizado, `tnum`. Caixa ativa com borda 2dp `border.focus` |
| Busca | Ícone `Search` 20dp `icon.muted` à esquerda (12dp de padding), raio `radius.pill`, altura 44dp, sem label acima |
| Multilinha (nota) | `minHeight: 96`, `textAlignVertical: 'top'`, `paddingTop: 14`, contador de caracteres em `caption`/`text.secondary` alinhado à direita abaixo |

---

## 6. Movimento

- Transição de borda e fundo ao focar/desfocar: **180ms** `easing.standard`. A borda passa de 1 para 2dp — implementar com `borderWidth` animado ou com uma borda interna sempre de 2dp cuja cor muda (preferível: evita reflow de layout).
- Erro entrando: fade + `height` de 0 para auto, 180ms.
- Nenhuma animação no cursor além da nativa.
- `useReducedMotion`: transições viram troca imediata; o estado visual permanece idêntico.

---

## 7. Teclado e comportamento

- `KeyboardAvoidingView` com `behavior="padding"` (iOS) / `"height"` (Android) no formulário, nunca por campo.
- Ao focar, a tela rola até deixar o campo com **≥24dp** de folga acima do teclado.
- `returnKeyType="next"` encadeando os campos; o último usa `"done"` e dispara o submit.
- `autoCapitalize`/`keyboardType` sempre explícitos — e-mail nunca capitaliza.

---

## 8. Acessibilidade

- O `label` é associado via `accessibilityLabel` no próprio `TextInput`; a mensagem de erro entra em `accessibilityHint` e o campo recebe `accessibilityState={{ invalid: true }}`.
- Contraste auditado: `#241E1A`/`#F2EBE1` = 12.4:1 ✅; `#6E635C`/`#FAF7F2` = 5.6:1 ✅ (label); `#B3261E`/`#F7E6E4` = 5.6:1 ✅ (erro sobre fundo tingido); `#BCB0A2`/`#F2EBE1` = 1.9:1 (placeholder — isento, e nunca carrega informação essencial).
- **Placeholder nunca substitui o label.** O label é obrigatório na interface (é prop requerida).
- Alvo do `rightAdornment` ≥48×48dp.
