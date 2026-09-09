# Estilo visual — Card

**Interface (props):** `specs/mobile/design-system/card.md`.

---

## 1. Geometria

| Medida | Valor |
|---|---|
| Raio | `radius.lg` = **20dp** (todos os cartões, sem exceção) |
| Borda | 1dp `border.default` — **sempre**, em light e dark |
| `padding="none"` | 0 (para cartão que contém lista ou imagem sangrada) |
| `padding="sm"` | 12 (`space.3`) |
| `padding="md"` | **16** (`space.4`) — default |
| `padding="lg"` | 20 (`space.5`) |
| Gap entre cartões empilhados | 12dp (`space.3`) em lista; 24dp (`space.6`) entre blocos de seção distintos |
| Largura | `screenWidth − 40` (margem lateral de 20dp de cada lado) |
| Gap interno entre linhas do cartão | 12dp (`space.3`) |

`overflow: 'hidden'` sempre — para a faixa colorida de instituição e imagens respeitarem o raio.

**Aninhamento:** um cartão dentro de um cartão perde a sombra, usa `bg.surface-sunken` como fundo, raio 12dp (`radius.sm`) e nenhuma borda. Não existe terceiro nível de aninhamento.

---

## 2. Cores e elevação

### 2.1 Light

| `elevation` | Fundo | Borda | Sombra |
|---|---|---|---|
| `none` | `#FFFFFF` | 1dp `#E5DCD0` | nenhuma |
| `low` (default) | `#FFFFFF` | 1dp `#E5DCD0` | `shadowColor #3A312C, opacity 0.08, radius 8, offset (0,2)` · Android `elevation: 2` |
| `medium` | `#FFFFFF` | 1dp `#E5DCD0` | `shadowColor #3A312C, opacity 0.12, radius 32, offset (0,8)` · Android `elevation: 12` |

A borda é mantida mesmo com sombra: `#FFFFFF` sobre `#FAF7F2` é 2% de diferença de luminância, insuficiente para definir a forma sozinho — especialmente em Android, cuja sombra nativa é fria e some sobre o `leite`.

### 2.2 Dark — elevação é cor, não sombra

| `elevation` | Fundo | Borda | Sombra |
|---|---|---|---|
| `none` | `#241F1B` | 1dp `#3D352F` | **nenhuma** |
| `low` | `#241F1B` | 1dp `#3D352F` | **nenhuma** |
| `medium` | `#2F2925` | 1dp `#3D352F` | **nenhuma** |

`shadowOpacity: 0` e `elevation: 0` em todos os casos no dark.

### 2.3 Variações de fundo

| Situação | Light | Dark |
|---|---|---|
| Cartão padrão | `#FFFFFF` | `#241F1B` |
| Cartão selecionado / ativo | `#FBF0EC` + borda 1.5dp `#E09B85` | `rgba(229,138,112,0.14)` + borda 1.5dp `#E58A70` |
| Cartão de dica / informativo | `#FDF3DC`, borda 1dp `#F2B441` a 40%, texto `#8A5F10` | `rgba(242,180,65,0.16)`, borda `rgba(242,180,65,0.4)`, texto `#F2B441` |
| Cartão de sucesso / confirmação | `#EEF3EF`, borda 1dp `#8FB39C`, texto `#1D4433` | `rgba(127,191,156,0.16)`, borda `rgba(127,191,156,0.4)`, texto `#7FBF9C` |
| Cartão de erro de sistema | `#F7E6E4`, borda 1dp `#B3261E` a 40%, texto `#5C1512` | `rgba(242,184,181,0.16)`, borda `rgba(242,184,181,0.4)`, texto `#F2B8B5` |

Nenhuma dessas variações usa sombra — fundo tingido e sombra juntos ficam sujos.

---

## 3. Cartão pressionável (`onPress`)

| Estado | Light | Dark |
|---|---|---|
| default | `#FFFFFF` | `#241F1B` |
| pressed | `#F2EBE1` + escala `0.985` | `#2F2925` + escala `0.985` |

- Duração 100ms, `easing.standard`, em `onPressIn`/`onPressOut`.
- `android_ripple={null}`.
- `accessibilityRole="button"` só quando `onPress` existe; sem ele o cartão é `accessibilityRole="none"` e seus filhos permanecem individualmente acessíveis.
- Chevron `ChevronRight` 20dp em `icon.muted` à direita, centralizado verticalmente, quando o cartão navega para outra tela.

---

## 4. Cartão de conta (aplicação canônica)

Definido em `03-visual-identity.md` §6.4 — este é o cartão de referência do produto.

```
┌─┬────────────────────────────────────────┐
│▌│  [logo 32]  Nubank              ›      │   ← título h3, chevron icon.muted
│▌│             conta corrente             │   ← caption / text.secondary
│▌│                                        │
│▌│  R$ 4.280,15                           │   ← amount-lg, money.neutral
└─┴────────────────────────────────────────┘
 ↑ faixa 4dp, cor da instituição
```

| Elemento | Especificação |
|---|---|
| Faixa da instituição | 4dp de largura, altura total, colada à borda esquerda (`position:'absolute'`), cor vinda da API |
| Padding | 16dp, mas `paddingLeft: 20` (16 + 4 da faixa) |
| Logo | `expo-image` 32×32, raio 8, `cachePolicy="disk"`, fallback `assets/images/bank-generic.svg` |
| Título (nome da instituição) | `h3` (Inter 600 17/24), `text.primary` |
| Subtítulo (tipo de conta) | `caption` (Inter 400 12/16), `text.secondary` |
| Saldo | `amount-lg` (Inter 600 24/30 tnum), `money.neutral` |
| Badge de status | canto superior direito, `Badge tone="warning"` quando sync pendente |
| Espaçamento vertical interno | 12dp entre bloco de identificação e saldo |

Saldo negativo: número em `money.neutral` com o sinal `−`, mais um `caption` "saldo negativo" em `money.negative-label` logo abaixo. **Nunca vermelho** (`03-visual-identity.md` §2.5).

---

## 5. Cartão de resumo do dashboard

Ver `../screens/layout-patterns.md` §4 para o layout completo. Especificidades de estilo:

- `elevation="low"`, `padding="lg"` (20dp), fundo `bg.surface`.
- Valor-herói em `amount-hero` (Fraunces 600 34/40 tnum), centralizado — **única** ocorrência de valor em serifa no app.
- Rótulo acima do valor em `label` (Inter 500 13/18), `text.secondary`, centralizado.
- Comparação abaixo em `body-sm`, `text.secondary`, com o número em `body-strong`. Tom neutro: "R$ 280 acima da média de vocês" — sem cor de alarme.
- Divisor interno 1dp `border.subtle` antes do rodapé de entradas/saídas, com 16dp acima e abaixo.

---

## 6. Acessibilidade

- Contraste do fundo do cartão contra `bg.app`: `#FFFFFF` vs `#FAF7F2` = 1.06:1 — insuficiente sozinho, **por isso a borda é obrigatória**. Componentes de UI precisam de 3:1 de contraste na sua delimitação (WCAG 1.4.11): `#E5DCD0` vs `#FAF7F2` = 1.2:1 não atinge, então a definição vem da **combinação borda + sombra**, e o conteúdo do cartão é o que carrega a informação — o cartão é agrupamento visual, não controle. Para cartões **pressionáveis**, o chevron em `icon.muted` (5.6:1) é o indicador acessível de interatividade.
- Cartão pressionável: `accessibilityLabel` descreve o conteúdo agregado ("Nubank, conta corrente, saldo 4.280 reais e 15 centavos").
- `accessible={true}` no cartão pressionável agrupa os filhos em um único nó de leitor de tela.
