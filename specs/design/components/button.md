# Estilo visual — Button

**Interface (props):** `specs/mobile/design-system/button.md` — não redefinir aqui.
**Tokens:** `../tokens/colors.md`, `../tokens/typography.md`, `../tokens/spacing-layout.md`, `../tokens/elevation-radius-icons.md`, `../tokens/motion.md`.

---

## 1. Geometria (independente de variante)

| Medida | `sm` | `md` | `lg` |
|---|---|---|---|
| `minHeight` | 36 | 44 | **52** (default em fluxos) |
| `paddingHorizontal` | 12 (`space.3`) | 16 (`space.4`) | 20 (`space.5`) |
| Tipografia | `button-sm` (Inter 600 13/18) | `button` (Inter 600 15/20) | `button` (Inter 600 15/20) |
| Ícone (`leftIcon`) | 16 | 20 | 20 |
| Gap ícone↔label | 8 (`space.2`) | 8 | 8 |
| `hitSlop` vertical | 6 | 2 | 0 |

- **Raio:** `radius.md` = **14dp** em todos os tamanhos e variantes.
- **`fullWidth`:** `alignSelf: 'stretch'`. É o default nas telas de fluxo (login, cadastro, onboarding, formulários) — nunca botão primário curto centralizado em tela de formulário.
- **`minHeight`, nunca `height`** — a fonte do sistema pode escalar até 200%.
- Label: `numberOfLines={1}`, sem ponto final (`02-tone-of-voice.md` §2), verbo no infinitivo.
- Dois botões lado a lado: gap de 12dp (`space.3`), o primário sempre à **direita** em par horizontal; em par vertical, o primário em cima e o secundário embaixo com 8dp entre eles.

---

## 2. Cores por variante e estado

### 2.1 `primary` — Light

| Estado | Fundo | Label / ícone | Borda |
|---|---|---|---|
| default | `#B04530` | `#FFFFFF` | — |
| pressed | `#8F3626` | `#FFFFFF` | — |
| disabled | `#F2EBE1` | `#BCB0A2` | — |
| focus (teclado/TV) | `#B04530` | `#FFFFFF` | anel externo 2dp `#B04530` com 2dp de offset |
| loading | `#B04530` | spinner `#FFFFFF` 18dp | — |

### 2.2 `primary` — Dark

| Estado | Fundo | Label / ícone |
|---|---|---|
| default | `#E58A70` | `#241E1A` |
| pressed | `#C9553D` | `#241E1A` |
| disabled | `#2F2925` | `#6E635C` |
| loading | `#E58A70` | spinner `#241E1A` |

> `terracota-500` (`#C9553D`) **nunca** é fundo de botão no light (4.0:1 com branco, reprova AA). No dark ele só existe como estado *pressed*, onde o texto é escuro.

### 2.3 `secondary`

| Estado | Light: fundo / label / borda | Dark: fundo / label / borda |
|---|---|---|
| default | `transparent` / `#241E1A` / **1.5dp** `#E5DCD0` | `transparent` / `#F2EBE3` / 1.5dp `#3D352F` |
| pressed | `#F2EBE1` / `#241E1A` / 1.5dp `#BCB0A2` | `#2F2925` / `#F2EBE3` / 1.5dp `#6E635C` |
| disabled | `transparent` / `#BCB0A2` / 1.5dp `#F2EBE1` | `transparent` / `#6E635C` / 1.5dp `#2F2925` |
| loading | `transparent` / spinner `#241E1A` / 1.5dp `#E5DCD0` | idem com `#F2EBE3` |

Borda de **1.5dp** (não 1) — é o único componente com essa espessura, para o botão secundário ter presença sem fundo.

### 2.4 `ghost`

| Estado | Light: fundo / label | Dark: fundo / label |
|---|---|---|
| default | `transparent` / `#8F3626` | `transparent` / `#E58A70` |
| pressed | `#FBF0EC` / `#8F3626` | `rgba(229,138,112,0.14)` / `#E58A70` |
| disabled | `transparent` / `#BCB0A2` | `transparent` / `#6E635C` |

Sem borda. `paddingHorizontal` cai para 12dp em todos os tamanhos (o ghost não precisa de peso visual), mas o alvo de toque continua ≥48dp via `hitSlop`.

### 2.5 `destructive`

**Nunca botão vermelho cheio** (`03-visual-identity.md` §6.4). O destrutivo é um ghost vermelho.

| Estado | Light: fundo / label | Dark: fundo / label |
|---|---|---|
| default | `transparent` / `#B3261E` | `transparent` / `#F2B8B5` |
| pressed | `#F7E6E4` / `#B3261E` | `rgba(242,184,181,0.14)` / `#F2B8B5` |
| disabled | `transparent` / `#BCB0A2` | `transparent` / `#6E635C` |

Em confirmação de ação irreversível dentro de bottom sheet, o par é: destrutivo (ghost vermelho) + secundário. **O secundário nunca se chama "Cancelar"** quando pode ser uma escolha positiva ("Deixar como está") — `02-tone-of-voice.md` §4.9.

---

## 3. Elevação

**Nenhuma, em nenhuma variante.** Botão não tem sombra na Vidinha — a hierarquia vem da cor cheia contra o fundo neutro. Isso vale para light e dark.

Exceção única: botão fixo de rodapé sobre conteúdo rolável ganha uma **faixa de fundo** (não sombra no botão): container com `bg.surface`, `borderTopWidth: 1`, `borderTopColor: border.default`, `paddingHorizontal: 20`, `paddingTop: 12`, `paddingBottom: insets.bottom + 16`.

---

## 4. Movimento

- Pressed: troca de cor de fundo em **100ms** `easing.standard`, disparada em `onPressIn`/`onPressOut`.
- **Botão não escala.** Encolher um alvo de 52dp durante o gesto quebra a área de toque.
- `android_ripple={null}` — usamos o mesmo feedback de cor nas duas plataformas.
- `loading`: a **largura do botão trava** no valor medido antes do spinner entrar (`onLayout` guarda a largura), para o layout não reflui. O label some por fade de 100ms; o spinner entra por fade de 100ms.
- Sem háptico em botão comum. Háptico `Light` só em: confirmar compartilhamento e concluir conexão de banco.

---

## 5. Estados de interação — regras

1. `disabled` e `loading` desligam `onPress` e setam `accessibilityState={{ disabled: true, busy: loading }}`.
2. `loading` **não** aplica opacidade ao botão inteiro — o fundo permanece cheio; só o conteúdo troca. Opacidade global faz o botão parecer desabilitado quando na verdade está trabalhando.
3. `disabled` no primário perde a cor de marca por completo (fundo `areia-100`): um botão terracota translúcido lê como "quase clicável" e frustra.
4. Anel de foco só existe em navegação por teclado/controle (Android TV, teclado externo em iPad). Não desenhar foco em toque.

---

## 6. Acessibilidade

- `accessibilityRole="button"`, `accessibilityLabel` = `label` (ou label descritivo quando o botão é só ícone).
- Contraste auditado: `#FFFFFF`/`#B04530` = 5.4:1 ✅; `#241E1A`/`#E58A70` = 7.6:1 ✅; `#B3261E`/`#FAF7F2` = 6.1:1 ✅; `#8F3626`/`#FAF7F2` = 8.0:1 ✅.
- `disabled` está isento de contraste por WCAG 1.4.3, mas mesmo assim `#BCB0A2` sobre `#F2EBE1` dá 1.9:1 — por isso o botão desabilitado **sempre** vem acompanhado de um `caption` em `text.secondary` explicando o que falta ("Preencha o e-mail para continuar"). Nunca um botão morto sem explicação.

---

## 7. Snippet de referência

```ts
const styles = {
  base: {
    minHeight: 52, borderRadius: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  primary:        { backgroundColor: t.action.primary.bg },
  primaryPressed: { backgroundColor: t.action.primary.bgPressed },
  primaryLabel:   { ...type.button, color: t.action.primary.fg },
};
```
