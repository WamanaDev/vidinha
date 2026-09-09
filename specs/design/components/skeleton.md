# Estilo visual — Skeleton

**Interface (props):** `specs/mobile/design-system/skeleton.md`.
**Princípio:** o skeleton é a única animação em loop permitida no app, e ele imita a **forma real** do conteúdo que vai chegar.

---

## 1. Cores

| Elemento | Light | Dark |
|---|---|---|
| Base do placeholder | `#F2EBE1` (areia-100) | `#2F2925` (dark/superficie-2) |
| Highlight do shimmer | `#FAF7F2` (leite) — mais **claro** que a base | `#3D352F` (dark/borda) — mais **claro** que a base |
| Base sobre cartão branco | `#F2EBE1` | `#2F2925` |
| Base dentro de campo afundado | `#E5DCD0` (areia-200) | `#3D352F` |

O shimmer é um gradiente linear de 3 paradas — `base → highlight → base` — com 60% de largura da faixa, percorrendo o elemento da esquerda para a direita.

**Sem cinza frio.** `#F2EBE1` tem matiz quente (~30°), igual ao resto do sistema. Um skeleton `#E0E0E0` denuncia o app inteiro como genérico.

**Sem cor de marca.** O skeleton nunca é terracota — é ausência de conteúdo, não conteúdo em destaque.

---

## 2. Geometria

| `borderRadius` | Uso |
|---|---|
| **4dp** | Linha de texto (default quando o skeleton simula texto) |
| `radius.xs` = 8 | Bloco pequeno, thumbnail, chip |
| `radius.sm` = 12 | Campo de formulário |
| `radius.lg` = 20 | Cartão inteiro |
| `radius.full` | Avatar, `ProgressRing` |

**Alturas canônicas** (casam com a entrelinha real da tipografia, para não haver salto de layout quando o conteúdo chega):

| Simula | `height` | `width` |
|---|---|---|
| `caption` (12/16) | 12 | 40–56dp |
| `body` / `label` (15/22 · 13/18) | 14 | `'60%'`–`'90%'` |
| `h3` (17/24) | 16 | `'50%'` |
| `h2` (20/26) | 20 | `'70%'` |
| `h1` (26/32) | 24 | `'80%'` |
| `amount` (15/22) | 14 | 72dp |
| `amount-lg` (24/30) | 22 | 120dp |
| `amount-hero` (34/40) | 32 | 180dp |
| Avatar `sm` / `md` | 32 / 40 | igual (círculo) |
| Cartão de conta | 104 | `'100%'` |
| Linha de `ListItem` | 64 | `'100%'` |

**Gap entre linhas de skeleton (`count > 1`):** 12dp (`space.3`) para blocos; 8dp (`space.2`) para linhas de texto do mesmo parágrafo.

**Regra da última linha:** quando `count > 1` simula um parágrafo, a última linha tem `width: '60%'` — parágrafo real não termina alinhado à direita. Isso é o que faz o skeleton parecer texto e não código de barras.

---

## 3. Animação do shimmer

| Parâmetro | Valor |
|---|---|
| Duração de um ciclo | **1200ms** (`duration.shimmer`) |
| Easing | `linear` |
| Repetição | infinita, sem pausa entre ciclos |
| Direção | esquerda → direita |
| Sincronização | **todos os skeletons visíveis compartilham o mesmo relógio** — um único `SharedValue` global em `useSkeletonShimmer()`, não um por instância |
| Implementação | `react-native-reanimated` + `expo-linear-gradient`, `useAnimatedStyle` com `translateX` |

A sincronização é o detalhe que separa um carregamento calmo de uma tela epiléptica: com N shimmers independentes, cada um começa em uma fase diferente e a tela "ferve".

**Alternativa aceitável** (Android antigo, se o gradiente custar caro): pulso de opacidade entre `1.0` e `0.55` em 1200ms, `easing.standard` com `reverse: true`. Nunca as duas técnicas na mesma tela.

---

## 4. Movimento reduzido

Com `isReduceMotionEnabled`:
- O shimmer **para**. O placeholder fica estático em `bg.surface-sunken`.
- Nenhum fallback de pulso — estático é estático.

---

## 5. Transição para o conteúdo

- **Cross-fade de 180ms** (`duration.fast`, `easing.standard`) entre o skeleton e o conteúdo real. Nunca corte seco, nunca slide.
- O skeleton **ocupa exatamente o espaço do conteúdo final**. Se o layout salta na troca, o skeleton está com as dimensões erradas — corrija o skeleton, não o conteúdo.
- **Duração mínima de exibição: 400ms.** Se a query resolve em 80ms, o skeleton ainda fica 400ms na tela. Um flash de 80ms é mais desconfortável que uma espera de 400ms honesta.
- Skeleton nunca aparece em **refetch** de dados já carregados (`isRefetching`): nesse caso os dados antigos permanecem e o novo valor entra por cross-fade (`motion.md` §5).

---

## 6. Receitas por tela

| Tela | Composição do skeleton |
|---|---|
| Dashboard (home) | 1 cartão de resumo (`height: 160, radius: 20`) + 3 linhas de `ListItem` (64dp) |
| Contas / Cartões | 3 cartões de conta (104dp, gap 12dp) |
| Lançamentos | 8 linhas de `ListItem` (64dp) com avatar circular 32dp + 2 linhas de texto + bloco de valor 72×14 à direita |
| Detalhe de conta | Bloco de header (`amount-lg` 120×22 + `caption` 56×12) + 6 linhas de `ListItem` |
| Membros da família | 4 linhas com avatar 40dp + texto 60% |
| Configurações | Nenhum — a tela é estática e não depende de query |

Cada tela declara seu skeleton como um componente irmão (`HomeSkeleton.tsx`), não um `<Skeleton count={5}/>` genérico. Skeleton genérico é pior que spinner.

---

## 7. Acessibilidade

- Container do skeleton: `accessibilityRole="progressbar"`, `accessibilityLabel="Carregando"`, `accessibilityState={{ busy: true }}`.
- Os retângulos individuais são decorativos: `accessibilityElementsHidden={true}` / `importantForAccessibility="no-hide-descendants"`.
- Contraste do skeleton contra o fundo é **irrelevante por design** (não carrega informação) — mas a base nunca deve sumir por completo: `#F2EBE1` sobre `#FAF7F2` = 1.06:1 é fraco demais em tela cheia, por isso, quando o skeleton fica sobre `bg.app`, ele vai dentro de um cartão com borda, ou usa `#E5DCD0` (areia-200) como base.
