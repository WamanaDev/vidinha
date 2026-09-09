# Estilo visual — ListItem

**Interface (props):** `specs/mobile/design-system/list-item.md`.
É a linha mais repetida do app (transações, contas, cartões, membros, categorias, recorrências) — cada decisão aqui se multiplica por milhares de renders.

---

## 1. Geometria

```
┌────────────────────────────────────────────────────────┐
│ ←16→ [left 40] ←12→ Título              ←12→ [right] ←16→ │  minHeight 64
│                     Subtítulo                            │
└────────────────────────────────────────────────────────┘
       └──────── divisor começa aqui (68dp da borda) ──────┘
```

| Medida | Valor |
|---|---|
| `minHeight` (2 linhas) | **64dp** |
| `minHeight` (1 linha, sem `subtitle`) | **56dp** |
| `paddingHorizontal` | 16dp (`space.4`) |
| `paddingVertical` | 12dp (`space.3`) — com `minHeight` garantindo o resto |
| `leftElement` | 40×40dp (avatar `md`, logo de instituição, círculo de categoria) |
| Gap `leftElement` → texto | 12dp (`space.3`) |
| Gap texto → `rightElement` | 12dp mínimo, com o texto em `flex: 1` |
| Gap título → subtítulo | 2dp |
| Divisor | 1dp, `border.subtle`, `marginLeft: 68` (16 + 40 + 12) quando há `leftElement`; `marginLeft: 16` quando não há |
| Raio | **0** quando a linha está dentro de lista corrida; `radius.sm` (12) quando é uma linha isolada em cartão |

- `alignItems: 'center'` na horizontal.
- Título com `numberOfLines={1}`, `ellipsizeMode="tail"`. Subtítulo com `numberOfLines={1}`.
- **O `rightElement` nunca é truncado.** O texto cede espaço, o valor nunca (`spacing-layout.md` §6.3).
- Alvo de toque: a linha inteira (≥56dp × largura total) — nunca só o chevron.

---

## 2. Tipografia

| Elemento | Estilo | Cor light | Cor dark |
|---|---|---|---|
| `title` | `body-strong` (Inter 600 15/22) | `#241E1A` | `#F2EBE3` |
| `subtitle` | `caption` (Inter 400 12/16) | `#6E635C` | `#B0A498` |
| Valor no `rightElement` | `amount` (Inter 600 15/22 tnum) | ver `amount.md` | ver `amount.md` |
| Chevron | `ChevronRight` 20dp | `#6E635C` | `#B0A498` |

O título usa peso **600**, não 400: em uma lista densa de transações, o nome do estabelecimento precisa ganhar do subtítulo (categoria + data) sem precisar de tamanho maior.

---

## 3. Cores e estados

### Light

| Estado | Fundo | Título | Subtítulo | Ícones |
|---|---|---|---|---|
| default | `transparent` (herda `bg.surface` ou `bg.app`) | `#241E1A` | `#6E635C` | `#6E635C` |
| pressed | `#F2EBE1` (areia-100) | `#241E1A` | `#6E635C` | `#6E635C` |
| selected | `#FBF0EC` (terracota-50) | `#241E1A` | `#6E635C` | `#B04530` |
| disabled | `transparent` | `#BCB0A2` | `#BCB0A2` | `#BCB0A2` |
| zebrada (opcional, tabelas) | ímpares `#F2EBE1` | — | — | — |

### Dark

| Estado | Fundo | Título | Subtítulo | Ícones |
|---|---|---|---|---|
| default | `transparent` | `#F2EBE3` | `#B0A498` | `#B0A498` |
| pressed | `#2F2925` | `#F2EBE3` | `#B0A498` | `#B0A498` |
| selected | `rgba(229,138,112,0.14)` | `#F2EBE3` | `#B0A498` | `#E58A70` |
| disabled | `transparent` | `#6E635C` | `#6E635C` | `#6E635C` |

**Nenhuma elevação, nenhuma sombra, nenhuma borda** além do divisor. A linha é plana; a superfície abaixo dela é que tem elevação.

`disabled` reduz a cor mas **não** aplica `opacity` ao container — opacidade também apagaria o `leftElement`, e o logo do banco precisa continuar reconhecível.

---

## 4. `leftElement` — apresentações canônicas

| Contexto | Conteúdo |
|---|---|
| Transação | Círculo 40dp, fundo `bg.surface-sunken` (light) / `bg.surface-raised` (dark), ícone de categoria 20dp em `icon.default` |
| Conta / cartão | Logo da instituição via `expo-image` 40×40, raio 8, `cachePolicy="disk"`, fallback `bank-generic.svg` |
| Membro da família | `Avatar size="md"` (40dp) |
| Categoria | Círculo 40dp com a cor da categoria a 14% de alfa + ícone 20dp na cor cheia |
| Conta que se repete | Círculo 40dp `bg.surface-sunken` + ícone `CalendarClock` 20dp |
| Configurações | Ícone 24dp em `icon.default`, **sem** círculo, com `leftElement` de 24dp e gap de 16dp |

---

## 5. `rightElement` — apresentações canônicas

| Conteúdo | Alinhamento |
|---|---|
| `Amount` | À direita, `textAlign: 'right'`, `tnum`. Se houver segunda linha (data), ela vai em `caption`/`text.secondary` alinhada à direita, gap 2dp |
| `Badge` | À direita, centralizado verticalmente |
| Chevron | 20dp `icon.muted` |
| `Switch` | Nativo, `trackColor` = `#B04530` (light) / `#E58A70` (dark) quando ligado, `#E5DCD0` / `#3D352F` quando desligado; `thumbColor` `#FFFFFF` / `#F2EBE3` |
| `Amount` + chevron | Valor, gap 8dp, chevron. Combinação permitida; qualquer outra combinação de três elementos, não |

---

## 6. Movimento e performance

- Pressed: fundo troca em **100ms** `easing.standard`, em `onPressIn`/`onPressOut`. `android_ripple={null}`.
- **Sem escala.** Escalar uma linha de lista faz a lista inteira parecer instável.
- Item removido: fade + colapso de altura, 240ms. Item adicionado: fade 180ms, sem slide.
- **`React.memo(ListItem)` é obrigatório** (`specs/mobile/design-system/list-item.md`). Consequência de estilo: os objetos de estilo precisam ser estáticos (`StyleSheet.create` fora do componente) ou memoizados por tema — um `style={{...}}` inline recria a referência a cada render e anula o `memo`.
- Os estilos dependentes de tema vêm de um `useMemo` no provider, não de um cálculo por item.
- `getItemLayout` é possível porque a altura é previsível: 64dp (2 linhas) ou 56dp (1 linha) + 1dp de divisor. Não introduzir alturas variáveis sem revisar isto.

---

## 7. Acessibilidade

- `accessible={true}` no container quando há `onPress` — o leitor anuncia a linha como um nó só.
- `accessibilityRole="button"` com `onPress`, `"none"` sem ele.
- `accessibilityLabel` agrega tudo em ordem natural: `"{title}, {subtitle}, {valor por extenso}"` → "Supermercado Pão de Açúcar, mercado, saíram 187 reais e 40 centavos". Nunca "menos 187" — ver `amount.md` §6.
- `accessibilityState={{ disabled, selected }}`.
- Contraste auditado: `#241E1A`/`#FFFFFF` = 16.1:1 ✅; `#6E635C`/`#FFFFFF` = 6.0:1 ✅; `#6E635C`/`#F2EBE1` (pressed) = 5.2:1 ✅; `#B0A498`/`#241F1B` = 6.8:1 ✅.
- Fonte ampliada a 200%: `minHeight` cresce livremente; o `leftElement` **não** escala (fica 40dp) e o `rightElement` quebra para baixo do texto quando a largura do valor + título passa da tela.
