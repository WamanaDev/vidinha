# Tokens de espaçamento e layout — Vidinha

**Fonte da verdade:** `branding/03-visual-identity.md` §6.1 e §6.4.
**Base 4, ritmo 8.** Nenhum valor de espaçamento fora desta escala entra no código.

---

## 1. Escala de espaçamento

| Token | dp | Uso canônico |
|---|---|---|
| `space.0` | 0 | Reset |
| `space.1` | 4 | Rótulo colado ao ícone; gap entre sinal e número em `Amount` |
| `space.2` | 8 | Padding interno de chip/badge; gap entre ícone e label de botão |
| `space.3` | 12 | Entre linhas de um cartão; gap vertical de `ListItem` interno |
| `space.4` | 16 | **Padding padrão de cartão**; padding horizontal de `ListItem`; gutter de grid |
| `space.5` | 20 | **Margem lateral da tela** (fixa) |
| `space.6` | 24 | Entre cartões; entre campos de formulário |
| `space.8` | 32 | Entre seções de uma tela |
| `space.12` | 48 | Respiro de topo de tela; espaço acima de ilustração de `EmptyState` |
| `space.16` | 64 | Respiro em telas de estado puro (erro/vazio de tela inteira) |

```ts
// src/config/theme/spacing.ts
export const space = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 12:48, 16:64 } as const;
```

**Valores proibidos:** 6, 10, 14, 18, 22, 28. Se um espaçamento "quase certo" pede 18, ele é 16 ou 20 — decida, não invente.

---

## 2. Margens e grid de tela

| Medida | Valor | Observação |
|---|---|---|
| Margem lateral da tela | **20dp** (`space.5`) | Fixa em todas as telas, incluindo modais e bottom sheet |
| Largura de conteúdo em tablet | **560dp máx., centralizado** | Acima disso, o conteúdo não estica — a margem cresce |
| Grid interno | **4 colunas, calha 16dp** | Para composições dentro de um cartão (ex.: grade de categorias) |
| Largura de coluna (tela 390dp) | `(390 − 40 − 3×16) / 4 = 75.5dp` | Calculada, nunca fixada |
| Respiro de topo (abaixo do header) | **24dp** (`space.6`) | 48dp (`space.12`) em telas sem header, tipo splash/onboarding |
| Respiro de base (fim do scroll) | **32dp** (`space.8`) + safe area | `contentContainerStyle.paddingBottom` |

Um cartão que ocupa a largura da tela mede `screenWidth − 40`. Um cartão dentro de outro cartão perde mais 16dp de cada lado.

---

## 3. Safe area

Regra única: **a safe area é aplicada por `edges`, nunca por `SafeAreaView` genérico**, para não duplicar padding sob o header ou sob a tab bar.

| Contexto | `edges` | Motivo |
|---|---|---|
| Tela dentro de `(tabs)` | `['top']` | A tab bar já resolve o bottom |
| Tela de stack com header nativo | `[]` | O header do Expo Router já respeita o top |
| Tela de stack sem header (fullscreen, webview do Pluggy) | `['top','bottom']` | — |
| Bottom sheet | `['bottom']` | Padding inferior = `max(insets.bottom, space.4)` |
| Botão fixo no rodapé (footer de formulário) | manual | `paddingBottom: insets.bottom + space.4` |

Fonte dos insets: `useSafeAreaInsets()` de `react-native-safe-area-context`. Nunca constantes hardcoded de notch.

---

## 4. Espaçamento de listas

| Medida | Valor |
|---|---|
| Altura mínima de `ListItem` | **64dp** (2 linhas) / **56dp** (1 linha) |
| Padding horizontal de `ListItem` | 16dp — mas o **divisor** começa a 16dp da borda esquerda do item, não a 0 |
| Padding vertical de `ListItem` | 12dp (`space.3`), com `minHeight` garantindo o resto |
| Divisor entre itens | 1dp (`StyleSheet.hairlineWidth` × 2 arredondado para 1) em `border.subtle` |
| Gap entre cartões em `FlatList` | **12dp** (`space.3`) via `ItemSeparatorComponent`, nunca `marginBottom` no item |
| Gap entre seções (`SectionList`) | 24dp acima do header de seção, 8dp abaixo |
| `contentContainerStyle` | `{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }` |

**Regra:** separador é `ItemSeparatorComponent`, nunca margem no item — margem no item cria um espaço fantasma no fim da lista e quebra o cálculo de `getItemLayout`.

---

## 5. Alvos de toque (acessibilidade — obrigatório)

| Regra | Valor |
|---|---|
| Alvo mínimo | **44×44dp** (iOS HIG) / **48×48dp** (Android Material) → **usamos 48×48 em tudo** |
| Ícone de 20 ou 24dp clicável | Envolver em `Pressable` de 48×48 com o ícone centralizado, **ou** usar `hitSlop={{top:12,bottom:12,left:12,right:12}}` |
| Distância mínima entre dois alvos | **8dp** (`space.2`) |
| Alvo de `ListItem` | A linha inteira é o alvo (≥56dp de altura × largura total) |
| Alvo de checkbox/switch em lista | A linha inteira alterna; o controle nunca é o único alvo |
| Botão `sm` | Altura visual 36dp, mas `hitSlop` vertical de 6dp em cada lado → 48dp efetivo |

Toda área tocável tem `accessibilityRole` e `accessibilityLabel` em português (`03-visual-identity.md` §7.4).

---

## 6. Alinhamento

1. **Tudo alinha à esquerda.** Texto centralizado existe em exatamente três lugares: `EmptyState`, `ErrorState` e o valor-herói do dashboard. Em nenhum outro lugar.
2. **Números alinham à direita** em qualquer coluna com dois ou mais valores. Com `tabular-nums`, os dígitos empilham.
3. **Baseline compartilhada:** o título e o valor de um `ListItem` alinham pela primeira linha (`alignItems: 'flex-start'` no container + o valor na mesma linha do título), não pelo centro do bloco.
4. **Ícone e texto** alinham pelo centro óptico: `alignItems: 'center'` em linha única; em bloco de duas linhas, o ícone alinha ao topo com `marginTop: 2`.
5. **Nada respira menos de 16dp da borda da tela.** Nem ilustração, nem sombra, nem badge.

---

## 7. Dimensões fixas de componente

Consolidadas aqui para não se contradizerem entre arquivos de componente:

| Componente | Altura / tamanho |
|---|---|
| Botão `lg` | 52dp (`minHeight`) |
| Botão `md` | 44dp |
| Botão `sm` | 36dp |
| `TextInput` | 52dp |
| Header de tela | 56dp de conteúdo + safe area top |
| Tab bar | 56dp de conteúdo + safe area bottom |
| `Avatar` xs/sm/md/lg | 24 / 32 / 40 / 64dp |
| `Badge` | 24dp de altura |
| Faixa colorida de instituição no cartão de conta | 4dp de largura, altura total do cartão |
| `ProgressRing` default | 64dp, traço 6dp |
| Ícone | 20 (inline) / 24 (padrão) / 32 (destaque) dp |
