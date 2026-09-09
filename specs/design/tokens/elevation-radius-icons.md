# Tokens de raio, elevação e iconografia — Vidinha

**Fonte da verdade:** `branding/03-visual-identity.md` §5.1, §6.2, §6.3.

---

## 1. Raios de canto

Um valor por componente, sem improviso. "Suave sem virar bolha."

| Token | dp | Componente |
|---|---|---|
| `radius.xs` | 8 | `Skeleton` de linha de texto, faixa de instituição, mini-chip dentro de cartão |
| `radius.sm` | 12 | **Campo de formulário** (`TextInput`), `Select`, área de código MFA |
| `radius.md` | 14 | **Botão** (todos os tamanhos) |
| `radius.lg` | 20 | **Cartão**, banner, `EmptyState`/`ErrorState` quando dentro de cartão |
| `radius.xl` | 24 | **Bottom sheet — só no topo** (`borderTopLeftRadius`/`borderTopRightRadius`) |
| `radius.pill` | 999 | Chip, tag, `Badge`, pílula de filtro |
| `radius.full` | 999 | `Avatar` (círculo), `ProgressRing`, botão-ícone circular |

```ts
export const radius = { xs:8, sm:12, md:14, lg:20, xl:24, pill:999, full:999 } as const;
```

**Regra de aninhamento:** um elemento arredondado dentro de outro usa `raio_externo − padding`. Ex.: imagem dentro de cartão (`radius.lg` 20, padding 16) → imagem com raio 8 (`radius.xs`). Nunca dois raios iguais aninhados — o de dentro parece maior.

**Ícone do app:** não desenhar máscara própria. iOS e Android aplicam a deles.

---

## 2. Elevação

Sem cinza de Material Design. Sombras **quentes e baixas**, de luz de sala — a cor da sombra é `grafite-800` (`#3A312C`), nunca preto.

### 2.1 Light mode

| Token | Uso | Especificação |
|---|---|---|
| `elevation.none` | Cartão dentro de lista, cartão sobre `bg.surface` | Sem sombra. Definição por **borda** 1dp `border.default` |
| `elevation.low` | **Cartão padrão** sobre `bg.app`, header ao rolar | `0 1px 2px rgba(58,49,44,0.06)` + `0 2px 8px rgba(58,49,44,0.04)` |
| `elevation.medium` | Bottom sheet, menu suspenso, toast, FAB | `0 8px 32px rgba(58,49,44,0.12)` |

React Native não empilha duas sombras em iOS nem aceita offset em Android. Implementação real:

```ts
// iOS
low:    { shadowColor:'#3A312C', shadowOpacity:0.08, shadowRadius:8,  shadowOffset:{width:0,height:2} },
medium: { shadowColor:'#3A312C', shadowOpacity:0.12, shadowRadius:32, shadowOffset:{width:0,height:8} },
// Android (elevation nativa, mais dura — compensada com borda)
low:    { elevation:2, borderWidth:1, borderColor: t.border.default },
medium: { elevation:12 },
```

**Regra:** no Android, `elevation.low` **sempre** vem acompanhada da borda `border.default` — a sombra nativa do Android é fria e some no fundo `leite`. No iOS a borda é opcional; use quando o cartão for branco sobre `leite` (contraste de 2% não basta sozinho).

**Nunca:** sombra colorida, sombra em ícone, sombra em texto, sombra no logotipo (`03-visual-identity.md` §4 — proibido).

### 2.2 Dark mode — elevação é cor, não sombra

Sombra em fundo escuro não existe opticamente. A hierarquia vem da superfície:

| Nível | Light | Dark |
|---|---|---|
| Fundo | `#FAF7F2` | `#191512` |
| Nível 1 (cartão) | `#FFFFFF` + sombra low | `#241F1B` **sem sombra** + borda `#3D352F` |
| Nível 2 (sheet, menu) | `#FFFFFF` + sombra medium | `#2F2925` **sem sombra** + borda `#3D352F` |
| Afundado (input) | `#F2EBE1` | `#191512` (afunda para o fundo) |

No dark, `shadowOpacity: 0` e `elevation: 0` em todos os componentes. A única exceção é o **scrim** do modal, que continua existindo (`bg.overlay` a 60%).

---

## 3. Iconografia

### 3.1 Família e traço

- **Biblioteca:** [Lucide](https://lucide.dev) via `lucide-react-native`. Licença ISC.
- **Espessura de traço:** **1.75dp** — fixo. Passar `strokeWidth={1.75}` sempre; o default do Lucide (2) é grosso demais para a leveza da marca.
- **Cantos:** arredondados (`strokeLinecap="round"`, `strokeLinejoin="round"` — já é o default do Lucide).
- **Grid do ícone:** 24×24 com área viva de 20×20 (2dp de respiro em cada lado). Ícones customizados de categoria seguem o mesmo grid e o mesmo traço de 1.75.
- **Proibido:** misturar famílias de ícone; usar ícone preenchido e ícone de traço na mesma tela.

### 3.2 Tamanhos

| Token | dp | Uso |
|---|---|---|
| `icon.inline` | 20 | Dentro de `Badge`, `TextInput.rightAdornment`, ao lado de `caption` |
| `icon.default` | 24 | Padrão: `ListItem.leftElement`, tab bar, header, botão |
| `icon.emphasis` | 32 | `EmptyState`/`ErrorState`, cabeçalho de seção de destaque |
| `icon.hero` | 48 | Ilustração-ícone em tela de estado puro |

Área de toque de qualquer ícone clicável: **≥48×48dp** (ver `spacing-layout.md` §5).

### 3.3 Cores de ícone

| Estado | Light | Dark |
|---|---|---|
| Padrão | `#3A312C` (grafite-800) | `#F2EBE3` |
| Secundário / chevron | `#6E635C` (cha-600) | `#B0A498` |
| Ativo (tab, seleção) | `#B04530` (terracota-600) | `#E58A70` |
| Desabilitado | `#BCB0A2` (areia-400) | `#6E635C` |
| Sobre botão primário | `#FFFFFF` | `#241E1A` |
| Semântico | `state.*.fg` do arquivo `colors.md` | idem |

### 3.4 Preenchido vs. outline

Regra binária, sem exceção:

- **Outline (padrão):** todo ícone do app.
- **Preenchido:** **só** para indicar o estado ativo de uma tab na bottom tab bar, e só se acompanhado de mudança de cor. Nenhum outro lugar.
- Se a lib não tiver a versão preenchida do ícone, a tab ativa fica **outline + `icon.active` + label em Inter 600** — nunca improvisar um preenchimento.

### 3.5 Ícones de categoria — o ponto de expressão

Pictogramas próprios, mesmo grid (24×24) e mesmo traço (1.75), mas **domésticos e brasileiros**: sacola de mercado, botijão, tomada, roteador, mochila de escola, coleira, guarda-chuva, panela, chave de casa.

**Proibido:** cifrão, cofrinho, porquinho, gráfico de pizza, carteira genérica, "categoria financeira" abstrata.

Apresentação padrão do ícone de categoria em lista: círculo de 40dp com fundo `bg.surface-sunken` (light) / `bg.surface-raised` (dark) e ícone de 20dp em `icon.default` centralizado. Quando a categoria tem cor própria definida pelo usuário, o círculo usa essa cor a 14% de alfa e o ícone usa a cor cheia — desde que a cor cheia venha de uma paleta restrita de 6 opções derivadas da marca (terracota-500, manjericao-600, manteiga-400, info, cha-600, terracota-700).

### 3.6 Ilustração

Herdado de `03-visual-identity.md` §5.2, resumido para uso em componente:

- Formas cheias, sem contorno, cantos macios, paleta restrita, grão de 5–8% de opacidade.
- Pessoas em silhueta, sem rosto detalhado, com variedade de tons de pele (paleta de 5), cabelos e corpos.
- Cenas domésticas e mundanas. **Nunca:** cofrinho, moeda voando, gráfico subindo, aperto de mão, foguete, escudo com cadeado.
- Tamanho em `EmptyState`: 160×120dp, centralizada, com 24dp abaixo dela antes do título.
- No dark mode, a ilustração recebe `opacity: 0.9` (ver `screens/dark-mode.md` §4).
