# Padrões de layout de tela — Vidinha

**Tokens:** `../tokens/`. **Componentes:** `../components/`. **Fluxo de telas:** `specs/mobile/navigation.md`.

---

## 1. Anatomia padrão de uma tela

```
┌──────────────────────────────────────┐
│ safe area top                        │
├──────────────────────────────────────┤
│ HEADER — 56dp                        │  bg.surface (opaco só ao rolar)
├──────────────────────────────────────┤
│                                      │
│ ↓ 24dp                               │
│ ←20dp→   conteúdo   ←20dp→           │  bg.app
│                                      │
│ ↓ 32dp (fim do scroll)               │
├──────────────────────────────────────┤
│ TAB BAR — 56dp                       │  bg.surface + borda superior
│ safe area bottom                     │
└──────────────────────────────────────┘
```

Margem lateral **fixa de 20dp** em todas as telas, sem exceção. Fundo de tela sempre `bg.app` (`#FAF7F2` / `#191512`) — nunca branco.

---

## 2. Header

### 2.1 Header de tela de aba (grande)

O título é parte do conteúdo, não da barra — para poder usar Fraunces em 26px sem estourar a barra nativa.

| Elemento | Especificação |
|---|---|
| Barra fixa | 56dp de altura + safe area top. Sem título nela em repouso |
| Ação à direita | Ícone 24dp, alvo 48×48, `icon.default`. Máximo **2** ícones |
| Título grande | `h1` (Fraunces 600 26/32), `text.primary`, no topo do scroll, com 24dp acima e 16dp abaixo |
| Subtítulo (opcional) | `body` em `text.secondary`, 4dp abaixo do título |

**Colapso ao rolar:** a partir de 32dp de `scrollY`, o título grande sai por fade (180ms) e um título compacto em `h3` (Inter 600 17/24) entra por fade na barra fixa. Sem slide, sem escala progressiva.

### 2.2 Fundo e separação do header

| Estado | Light | Dark |
|---|---|---|
| Topo do scroll (`scrollY = 0`) | `bg.app` (`#FAF7F2`), **sem borda, sem sombra** | `bg.app` (`#191512`), sem borda |
| Rolado (`scrollY > 0`) | `bg.surface` (`#FFFFFF`) + `elevation.low` | `bg.surface` (`#241F1B`) + **borda inferior 1dp `#3D352F`** |

Transição de 180ms `easing.standard`. No dark, elevação é cor + borda (`elevation-radius-icons.md` §2.2).

### 2.3 Header de tela de stack (detalhe)

| Elemento | Especificação |
|---|---|
| Altura | 56dp + safe area |
| Voltar | `ChevronLeft` 24dp em `icon.default`, alvo 48×48, encostado a 8dp da borda esquerda |
| Título | `h3` (Inter 600 17/24), `text.primary`, centralizado, `numberOfLines={1}` |
| Ação à direita | 1 ícone, ou 1 `Button variant="ghost" size="sm"` |
| Transição | Slide horizontal nativo da plataforma |

**Nunca** "Voltar" escrito por extenso ao lado do chevron no Android; no iOS, o comportamento nativo (com o título da tela anterior) é mantido.

### 2.4 Header modal

Fechar (`X` 24dp) à **esquerda**, título `h3` centralizado, ação de confirmar (`Button ghost sm`) à direita. Nunca chevron em modal — chevron significa hierarquia, `X` significa camada temporária.

---

## 3. Tab bar

Cinco abas (`navigation.md`): **Início · Contas · Cartões · Lançamentos · Família**.

| Elemento | Especificação |
|---|---|
| Altura | 56dp de conteúdo + `insets.bottom` |
| Fundo | `#FFFFFF` (light) / `#241F1B` (dark) |
| Separação do conteúdo | Borda superior 1dp `border.default` — **sempre**, nos dois temas. Sem sombra |
| Ícone | Lucide 24dp, traço 1.75 |
| Label | `label-sm` (Inter 500 11/14), `maxFontSizeMultiplier={1.4}` |
| Gap ícone → label | 4dp (`space.1`) |
| Alvo de toque | Largura da aba × 56dp (≥48dp garantido) |

### 3.1 Estado da aba

| Estado | Ícone | Label | Fundo |
|---|---|---|---|
| **Ativa** | Preenchido, `icon.active` (`#B04530` / `#E58A70`) | Inter **600**, `icon.active` | nenhum |
| Inativa | Outline, `icon.muted` (`#6E635C` / `#B0A498`) | Inter 500, `icon.muted` | nenhum |
| Pressed | mesma cor, opacidade 0.6 por 100ms | — | nenhum |

**A aba ativa é o único lugar do app onde ícone preenchido é permitido** (`elevation-radius-icons.md` §3.4) — e ele vem sempre acompanhado da mudança de cor **e** do peso do label: três portadores, nenhum deles sozinho.

Se a versão preenchida do ícone não existir no Lucide, a aba ativa fica outline + `icon.active` + label em 600.

**Sem pílula de fundo, sem indicador deslizante, sem animação de troca.** Abas são lugares paralelos; movimento sugeriria hierarquia (`motion.md` §3).

Ícones: Início `House` · Contas `Landmark` · Cartões `CreditCard` · Lançamentos `ArrowLeftRight` · Família `Users`.

---

## 4. Cartão de resumo do dashboard

O elemento mais importante da tela Início. É onde o valor-herói em Fraunces aparece.

```
┌────────────────────────────────────────────┐
│                                            │  ↑ padding 20dp
│           setembro · a casa toda           │  label · text.secondary · centralizado
│                                            │  ↓ 8dp
│              R$ 4.280,15                   │  amount-hero · Fraunces 600 34/40 tnum
│                                            │     money.neutral · centralizado
│                                            │  ↓ 8dp
│      R$ 280 acima da média de vocês        │  body-sm · text.secondary · centralizado
│                                            │  ↓ 20dp
│  ──────────────────────────────────────    │  divisor 1dp border.subtle
│                                            │  ↓ 16dp
│   ↓ entrou            ↑ saiu               │  caption · text.secondary
│   R$ 7.900,00         R$ 3.619,85          │  amount (Inter 600 15/22)
│   money.in            money.out            │  ← duas colunas iguais
│                                            │
└────────────────────────────────────────────┘
```

| Regra | Valor |
|---|---|
| `Card` | `elevation="low"`, `padding="lg"` (20dp), raio 20dp |
| Alinhamento | Centralizado — um dos três únicos lugares do app com texto centralizado |
| Valor-herói | `amount-hero` (Fraunces 600 34/40, `tnum`), `money.neutral`. Nunca colorido |
| Comparação | Tom neutro, sem juízo: "R$ 280 acima da média de vocês". **Sem** cor de alarme, sem seta colorida, sem percentual (`02-tone-of-voice.md` §4.4) |
| Entradas / saídas | Duas colunas de largura igual, separadas por 1dp `border.subtle` vertical opcional. Ícone 14dp + label em `caption`, valor em `amount` |
| Cor das colunas | Entrou = `money.in`; saiu = `money.out` (**preto/creme, não vermelho**) |
| Toggle de privacidade | Ícone `Eye`/`EyeOff` 20dp `icon.muted` no canto superior direito do cartão, alvo 48×48 — controla `hideValue` de todos os `Amount` da tela |
| Pilha de avatares | `Avatar size="xs"` sobrepostos, canto superior esquerdo, indicando quem está na família |

Abaixo do cartão: 24dp (`space.6`) antes da próxima seção.

---

## 5. Listas

### 5.1 `FlatList` — configuração padrão

```tsx
<FlatList
  data={items}
  keyExtractor={(i) => i.id}
  renderItem={renderItem}                       // useCallback obrigatório
  ItemSeparatorComponent={Separator}            // nunca marginBottom no item
  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 }}
  ListEmptyComponent={<EmptyState .../>}
  ListFooterComponent={isFetchingNextPage ? <Footer/> : null}
  refreshControl={<RefreshControl .../>}
  onEndReachedThreshold={0.5}
  windowSize={10}
  maxToRenderPerBatch={10}
  initialNumToRender={12}
  removeClippedSubviews
  getItemLayout={(_, i) => ({ length: 65, offset: 65 * i, index: i })}
/>
```

| Elemento | Especificação |
|---|---|
| Separador de `ListItem` | 1dp `border.subtle`, `marginLeft: 68` (alinha ao início do texto, não à borda da tela) |
| Separador de cartões | `View` transparente de 12dp de altura (`space.3`) |
| `paddingTop` | 8dp — o respiro grande vem do título da tela, não da lista |
| `paddingBottom` | 32dp (`space.8`); em tela de aba, o `insets.bottom` já é resolvido pela tab bar |
| Footer de paginação | Spinner 24dp `brand.primary` centralizado, `paddingVertical: 24` |
| Fundo | `bg.app`. Lista dentro de cartão: fundo `bg.surface` e o cartão com `padding="none"` |

### 5.2 Pull-to-refresh

| Propriedade | Light | Dark |
|---|---|---|
| `tintColor` (iOS) | `#B04530` | `#E58A70` |
| `colors` (Android) | `['#B04530']` | `['#E58A70']` |
| `progressBackgroundColor` (Android) | `#FFFFFF` | `#241F1B` |
| `progressViewOffset` | 8dp | 8dp |

- Indicador **nativo**. Sem Lottie, sem ilustração customizada, sem texto "solte para atualizar".
- Durante o refresh, a lista **mantém os dados antigos** visíveis — nunca troca para skeleton.
- Ao concluir, os valores que mudaram entram por cross-fade de 180ms (`motion.md` §3).
- Sem háptico ao disparar (o gesto já é a confirmação).
- Microcopy do vocabulário fixo: a ação chama-se **"atualizar"**, nunca "sincronizar" (`02-tone-of-voice.md` §6).

### 5.3 `SectionList` (transações agrupadas por dia)

| Elemento | Especificação |
|---|---|
| Header de seção | `label` (Inter 500 13/18), `text.secondary`, `paddingVertical: 8`, fundo `bg.app`, **não sticky** |
| Texto do header | Data relativa: "hoje", "ontem", "sexta"; absoluta a partir de 7 dias: "12 de março" |
| Total do dia à direita | `amount-compact` em `text.secondary` — opcional, e nunca colorido |
| Espaço acima da seção | 24dp; abaixo do header, 8dp |

Header não-sticky por decisão: sticky headers com fundo semitransparente sobre uma lista de valores em `tnum` criam sobreposição ilegível durante o scroll rápido.

---

## 6. Formulários

```
título da tela        h1
  ↓ 24dp
[ campo ]             bloco label+input+erro
  ↓ 24dp
[ campo ]
  ↓ 32dp
[ Botão primário ]    fullWidth, size lg (52dp)
  ↓ 12dp
[ Botão ghost ]       ação alternativa, centralizado
```

- Gap entre campos: **24dp** (`space.6`).
- Botão de submit: `primary`, `size="lg"`, `fullWidth`.
- Em formulário longo (>3 campos), o botão vira **fixo no rodapé**: container `bg.surface`, `borderTopWidth: 1` `border.default`, `paddingHorizontal: 20`, `paddingTop: 12`, `paddingBottom: insets.bottom + 16`.
- `KeyboardAvoidingView` no nível do formulário, nunca por campo.

---

## 7. Telas de estado puro

| Estado | Componente | Posicionamento |
|---|---|---|
| Carregando (primeira vez) | Skeleton específico da tela | Ocupa o espaço exato do conteúdo final |
| Vazio | `EmptyState` | `flex: 1, justifyContent: 'center'`, com 48dp de `paddingBottom` extra (centro óptico) |
| Erro | `ErrorState` | idem |
| Erro parcial (uma seção) | `ErrorState` compacto dentro do `Card` da seção | `paddingVertical: 32` |

Toda tela com query trata os três (`specs/mobile/00-overview.md` §2). Nenhuma tela mostra spinner de tela cheia.

---

## 8. Regras que valem para todas as telas

1. Margem lateral 20dp — inclusive em modal e bottom sheet.
2. Fundo `bg.app`, nunca branco puro no light nem preto puro no dark.
3. Máximo **3 níveis tipográficos** visíveis por tela.
4. Texto alinha à esquerda, salvo `EmptyState`, `ErrorState` e o valor-herói do dashboard.
5. Números alinham à direita em qualquer coluna com 2+ valores.
6. Máximo **um** bloco terracota cheio por tela (proporção 70/15/8/5 — `colors.md` §6).
7. Todo alvo tocável ≥48×48dp, com `accessibilityLabel` em português.
8. Nenhuma altura fixa em contêiner de texto — fonte do sistema escala até 200%.
