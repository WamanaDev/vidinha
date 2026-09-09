# Tokens de cor — Vidinha

**Fonte da verdade:** `branding/03-visual-identity.md` §2 e §8.
**Escopo:** este arquivo transforma a paleta de marca em um sistema de tokens **semânticos** (papel na interface), para light e dark mode. Nenhum hex fora da paleta de marca foi inventado, exceto os 4 tons derivados marcados com ⚠️ na §5.

**Regra de uso:** componentes **nunca** referenciam a paleta bruta (`terracota600`). Referenciam sempre o token semântico (`color.action.primary.bg`). A paleta bruta existe só dentro de `theme/colors.ts`.

---

## 1. Paleta bruta (não usar direto em componente)

Copiada literalmente de `03-visual-identity.md` §8. É a única fonte de hex do produto.

```ts
// src/config/theme/palette.ts
export const palette = {
  terracota: { 50:'#FBF0EC', 100:'#F6DDD4', 300:'#E09B85',
               500:'#C9553D', 600:'#B04530', 700:'#8F3626', 900:'#54211A' },
  manjericao:{ 50:'#EEF3EF', 300:'#8FB39C', 600:'#2F6B4F', 800:'#1D4433' },
  manteiga:  { 100:'#FDF3DC', 400:'#F2B441', 700:'#8A5F10' },
  neutro:    { leite:'#FAF7F2', papel:'#FFFFFF', areia100:'#F2EBE1',
               areia200:'#E5DCD0', areia400:'#BCB0A2', cha600:'#6E635C',
               grafite800:'#3A312C', grafite900:'#241E1A' },
  semantico: { positivo:'#2F6B4F', atencao:'#B77A16',
               erro:'#B3261E', info:'#3A6B8A', saida:'#3A312C' },
  dark:      { fundo:'#191512', superficie:'#241F1B', superficie2:'#2F2925',
               borda:'#3D352F', texto:'#F2EBE3', textoSecundario:'#B0A498',
               terracota:'#E58A70', manjericao:'#7FBF9C', erro:'#F2B8B5' },
  derivado:  { erro50:'#F7E6E4', erro900:'#5C1512',
               info50:'#E8EEF2', info300:'#8FB6CE' }, // ver §5
} as const;
```

---

## 2. Tokens semânticos — Light mode

### 2.1 Superfícies e fundo

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `bg.app` | `#FAF7F2` | leite | Fundo de toda tela. **Nunca `#FFFFFF`** |
| `bg.surface` | `#FFFFFF` | papel | Cartões, bottom sheet, tab bar, header |
| `bg.surface-sunken` | `#F2EBE1` | areia-100 | Fundo de campo de formulário, linha zebrada, skeleton base |
| `bg.surface-selected` | `#FBF0EC` | terracota-50 | Chip/linha/tab selecionada, item de lista ativo |
| `bg.surface-hover` | `#F6DDD4` | terracota-100 | Pressed de item de lista sobre superfície terracota |
| `bg.overlay` | `rgba(36,30,26,0.45)` | grafite-900 45% | Scrim atrás de bottom sheet e modal |
| `bg.scrim-image` | `rgba(36,30,26,0.08)` | grafite-900 8% | Véu sobre ilustração para garantir contraste de texto |

### 2.2 Bordas e divisores

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `border.default` | `#E5DCD0` | areia-200 | Borda de cartão, divisor de lista, borda de input em repouso |
| `border.strong` | `#BCB0A2` | areia-400 | Borda de botão secundário em pressed, tabela |
| `border.focus` | `#B04530` | terracota-600 | Anel de foco de input/botão (2px) |
| `border.error` | `#B3261E` | erro | Input em estado de erro |
| `border.subtle` | `#F2EBE1` | areia-100 | Separador interno dentro de cartão (baixo contraste) |

### 2.3 Texto e ícone

| Token | Hex | Origem | Contraste sobre `bg.app` | Uso |
|---|---|---|---|---|
| `text.primary` | `#241E1A` | grafite-900 | 14.2:1 | Títulos, valores em R$, nome de conta |
| `text.body` | `#3A312C` | grafite-800 | 11.9:1 | Texto corrido, corpo de parágrafo |
| `text.secondary` | `#6E635C` | cha-600 | 5.6:1 | Metadados, data, subtítulo de `ListItem` |
| `text.disabled` | `#BCB0A2` | areia-400 | 2.0:1 | Placeholder, label desabilitado (não-informativo) |
| `text.inverse` | `#FFFFFF` | papel | — | Texto sobre `action.primary.bg` |
| `text.link` | `#8F3626` | terracota-700 | 8.0:1 | Link inline em texto corrido |
| `icon.default` | `#3A312C` | grafite-800 | 11.9:1 | Ícone padrão Lucide |
| `icon.muted` | `#6E635C` | cha-600 | 5.6:1 | Chevron, ícone decorativo |
| `icon.active` | `#B04530` | terracota-600 | 5.1:1 | Tab ativa, ícone de estado selecionado |
| `icon.disabled` | `#BCB0A2` | areia-400 | 2.0:1 | Ícone desabilitado |

### 2.4 Marca e ação

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `brand.primary` | `#C9553D` | terracota-500 | Logotipo, ícone ≥24px, série 1 de gráfico. **Nunca texto pequeno** |
| `brand.secondary` | `#2F6B4F` | manjericao-600 | Escudo de segurança, série 2 de gráfico |
| `brand.accent` | `#F2B441` | manteiga-400 | Ilustração, série 3 de gráfico, badge "novo". **Nunca texto** |
| `action.primary.bg` | `#B04530` | terracota-600 | Fundo do botão primário |
| `action.primary.bg-pressed` | `#8F3626` | terracota-700 | Botão primário pressionado |
| `action.primary.bg-disabled` | `#F2EBE1` | areia-100 | Botão primário desabilitado |
| `action.primary.fg` | `#FFFFFF` | papel | Label do botão primário (5.4:1) |
| `action.primary.fg-disabled` | `#BCB0A2` | areia-400 | Label desabilitado |
| `action.secondary.bg` | `transparent` | — | Botão secundário |
| `action.secondary.bg-pressed` | `#F2EBE1` | areia-100 | Botão secundário pressionado |
| `action.secondary.border` | `#E5DCD0` | areia-200 | Borda 1.5px do botão secundário |
| `action.secondary.fg` | `#241E1A` | grafite-900 | Label do botão secundário |
| `action.ghost.fg` | `#8F3626` | terracota-700 | Botão texto / link de ação |
| `action.ghost.bg-pressed` | `#FBF0EC` | terracota-50 | Ghost pressionado |
| `action.destructive.fg` | `#B3261E` | erro | Label do botão destrutivo (6.1:1) |
| `action.destructive.bg-pressed` | `#F7E6E4` | erro-50 ⚠️ | Destrutivo pressionado. **Nunca botão vermelho cheio** |

### 2.5 Semânticos de estado

Cada estado tem 3 papéis: `fg` (texto/ícone sobre fundo claro), `bg` (fundo tingido) e `on-bg` (texto sobre esse fundo tingido).

| Estado | `fg` | `bg` | `on-bg` | Uso |
|---|---|---|---|---|
| `state.success` | `#2F6B4F` (manjericao-600) | `#EEF3EF` (manjericao-50) | `#1D4433` (manjericao-800) | Entrada de dinheiro, conexão ativa, convite aceito |
| `state.warning` | `#B77A16` (atencao) — **só ícone/borda** | `#FDF3DC` (manteiga-100) | `#8A5F10` (manteiga-700) | Conta a vencer, sync pendente, saldo negativo (rótulo) |
| `state.error` | `#B3261E` (erro) | `#F7E6E4` ⚠️ | `#5C1512` ⚠️ | **Só erro de sistema e ação destrutiva** |
| `state.info` | `#3A6B8A` (info) | `#E8EEF2` ⚠️ | `#3A6B8A` | Dica, banner informativo de sistema |
| `state.neutral` | `#6E635C` (cha-600) | `#F2EBE1` (areia-100) | `#3A312C` (grafite-800) | Badge sem conotação, status desconhecido |

> ⚠️ **`#B77A16` tem 3.4:1 sobre `bg.app`** — passa AA só como ícone/borda (≥3:1). Para **texto** de aviso use sempre `#8A5F10` (5.3:1). Esta é a única armadilha de contraste da paleta.

### 2.6 Dinheiro (a regra mais importante do produto)

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `money.in` | `#2F6B4F` | manjericao-600 | Entrada / receita. Sempre com sinal `+` |
| `money.out` | `#3A312C` | grafite-800 | **Saída / despesa. Gasto é preto, nunca vermelho.** Sempre com sinal `−` |
| `money.neutral` | `#241E1A` | grafite-900 | Saldo, total, valor-herói, valor sem direção |
| `money.negative-label` | `#8A5F10` | manteiga-700 | Rótulo textual ao lado de saldo negativo ("saldo negativo") |
| `money.hidden` | `#BCB0A2` | areia-400 | Dígitos mascarados `••••` do modo privacidade |

**Proibido:** aplicar `state.error` a qualquer valor monetário, incluindo saldo negativo. Saldo negativo = número em `money.neutral` com sinal + rótulo em `money.negative-label`.

---

## 3. Tokens semânticos — Dark mode

Não é inversão: é a mesma casa à noite. Base marrom-esverdeada, nunca `#000000`.

### 3.1 Superfícies

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `bg.app` | `#191512` | dark/fundo | Fundo de tela |
| `bg.surface` | `#241F1B` | dark/superficie | Cartão, header, tab bar (elevação nível-1) |
| `bg.surface-sunken` | `#191512` | dark/fundo | Campo de formulário (afunda em vez de subir) |
| `bg.surface-raised` | `#2F2925` | dark/superficie-2 | Bottom sheet, menu, cartão sobre cartão (nível-2) |
| `bg.surface-selected` | `rgba(229,138,112,0.14)` | dark/terracota 14% | Item/tab selecionada |
| `bg.overlay` | `rgba(10,8,7,0.60)` | — | Scrim de modal (mais denso que no light) |

### 3.2 Bordas

| Token | Hex | Uso |
|---|---|---|
| `border.default` | `#3D352F` (dark/borda) | Cartão, divisor, input em repouso |
| `border.strong` | `#6E635C` (cha-600) | Botão secundário, borda de ênfase |
| `border.focus` | `#E58A70` (dark/terracota) | Anel de foco |
| `border.error` | `#F2B8B5` (dark/erro) | Input em erro |
| `border.subtle` | `#2F2925` | Separador interno de cartão |

### 3.3 Texto e ícone

| Token | Hex | Contraste sobre `bg.app` | Uso |
|---|---|---|---|
| `text.primary` | `#F2EBE3` | 15.5:1 | Títulos, valores |
| `text.body` | `#F2EBE3` | 15.5:1 | Corpo (no dark, body = primary; a hierarquia vem de peso e tamanho) |
| `text.secondary` | `#B0A498` | 7.5:1 | Metadados, subtítulo |
| `text.disabled` | `#6E635C` | 2.5:1 | Placeholder, desabilitado |
| `text.inverse` | `#241E1A` | — | Texto sobre `action.primary.bg` (terracota clara) |
| `text.link` | `#E58A70` | 7.1:1 | Link inline |
| `icon.default` | `#F2EBE3` | 15.5:1 | Ícone padrão |
| `icon.muted` | `#B0A498` | 7.5:1 | Chevron, decorativo |
| `icon.active` | `#E58A70` | 7.1:1 | Tab ativa |
| `icon.disabled` | `#6E635C` | 2.5:1 | Desabilitado |

### 3.4 Marca e ação

| Token | Hex | Uso |
|---|---|---|
| `brand.primary` | `#E58A70` | Logotipo, ícones de destaque |
| `brand.secondary` | `#7FBF9C` | Escudo, série 2 |
| `brand.accent` | `#F2B441` | Ilustração, série 3 (inalterado — já é claro) |
| `action.primary.bg` | `#E58A70` | Botão primário (fundo claro, texto escuro) |
| `action.primary.bg-pressed` | `#C9553D` | Pressionado (escurece, terracota-500) |
| `action.primary.bg-disabled` | `#2F2925` | Desabilitado |
| `action.primary.fg` | `#241E1A` | Label (7.6:1 sobre `#E58A70`) |
| `action.primary.fg-disabled` | `#6E635C` | Label desabilitado |
| `action.secondary.bg` | `transparent` | — |
| `action.secondary.bg-pressed` | `#2F2925` | — |
| `action.secondary.border` | `#3D352F` | — |
| `action.secondary.fg` | `#F2EBE3` | — |
| `action.ghost.fg` | `#E58A70` | — |
| `action.ghost.bg-pressed` | `rgba(229,138,112,0.14)` | — |
| `action.destructive.fg` | `#F2B8B5` | 9.7:1 |
| `action.destructive.bg-pressed` | `rgba(242,184,181,0.14)` | — |

### 3.5 Semânticos de estado (dark)

| Estado | `fg` | `bg` | `on-bg` |
|---|---|---|---|
| `state.success` | `#7FBF9C` (8.5:1) | `rgba(127,191,156,0.16)` | `#7FBF9C` |
| `state.warning` | `#F2B441` (10.0:1) | `rgba(242,180,65,0.16)` | `#F2B441` |
| `state.error` | `#F2B8B5` (9.7:1) | `rgba(242,184,181,0.16)` | `#F2B8B5` |
| `state.info` | `#8FB6CE` ⚠️ (7.9:1) | `rgba(143,182,206,0.16)` | `#8FB6CE` |
| `state.neutral` | `#B0A498` (7.5:1) | `#2F2925` | `#F2EBE3` |

> No dark, `atencao` sobe para `manteiga-400` (`#F2B441`) — o âmbar terroso `#B77A16` some no fundo escuro (2.9:1). E, ao contrário do light, aqui **o mesmo hex serve de `fg` e de `on-bg`**, porque os fundos tingidos são alfa sobre superfície escura.

### 3.6 Dinheiro (dark)

| Token | Hex |
|---|---|
| `money.in` | `#7FBF9C` |
| `money.out` | `#F2EBE3` (no dark o "preto" do gasto vira o texto padrão — continua **neutro**, nunca vermelho) |
| `money.neutral` | `#F2EBE3` |
| `money.negative-label` | `#F2B441` |
| `money.hidden` | `#6E635C` |

---

## 4. Contraste WCAG AA — combinações auditadas

Meta obrigatória (`03-visual-identity.md` §7): texto normal ≥ 4.5:1, texto ≥18.66px/bold ≥14px e ícones ≥ 3:1.

### Light

| Combinação | Ratio | Veredito |
|---|---|---|
| `#241E1A` sobre `#FAF7F2` | 14.2:1 | ✅ AAA |
| `#3A312C` sobre `#FAF7F2` | 11.9:1 | ✅ AAA |
| `#6E635C` sobre `#FAF7F2` | 5.6:1 | ✅ AA |
| `#6E635C` sobre `#FFFFFF` | 6.0:1 | ✅ AA |
| `#FFFFFF` sobre `#B04530` | 5.4:1 | ✅ AA (botão primário) |
| `#FFFFFF` sobre `#C9553D` | 4.0:1 | ❌ **não usar 500 como fundo de botão** |
| `#FFFFFF` sobre `#2F6B4F` | 7.0:1 | ✅ AAA |
| `#B3261E` sobre `#FAF7F2` | 6.1:1 | ✅ AA |
| `#3A6B8A` sobre `#FAF7F2` | 5.4:1 | ✅ AA |
| `#8F3626` sobre `#FAF7F2` | 8.0:1 | ✅ AAA (link) |
| `#B77A16` sobre `#FAF7F2` | 3.4:1 | ⚠️ **só ícone/borda** |
| `#8A5F10` sobre `#FAF7F2` | 5.3:1 | ✅ AA (texto de aviso) |
| `#8A5F10` sobre `#FDF3DC` | 5.6:1 | ✅ AA (banner de aviso) |
| `#1D4433` sobre `#EEF3EF` | 9.5:1 | ✅ AAA (banner de sucesso) |
| `#BCB0A2` sobre `#FAF7F2` | 2.0:1 | ⚠️ só desabilitado/placeholder (isento por WCAG 1.4.3) |

### Dark

| Combinação | Ratio | Veredito |
|---|---|---|
| `#F2EBE3` sobre `#191512` | 15.5:1 | ✅ AAA |
| `#F2EBE3` sobre `#241F1B` | 14.0:1 | ✅ AAA |
| `#B0A498` sobre `#191512` | 7.5:1 | ✅ AAA |
| `#B0A498` sobre `#2F2925` | 5.9:1 | ✅ AA |
| `#241E1A` sobre `#E58A70` | 7.6:1 | ✅ AAA (botão primário) |
| `#7FBF9C` sobre `#191512` | 8.5:1 | ✅ AAA |
| `#F2B441` sobre `#191512` | 10.0:1 | ✅ AAA |
| `#F2B8B5` sobre `#191512` | 9.7:1 | ✅ AAA |
| `#E58A70` sobre `#191512` | 7.1:1 | ✅ AAA |
| `#B77A16` sobre `#191512` | 2.9:1 | ❌ **proibido no dark** — usar `#F2B441` |
| `#6E635C` sobre `#191512` | 2.5:1 | ⚠️ só desabilitado |

**Regra de teste no PR:** toda cor de texto nova precisa do par (`fg`, `bg`) auditado nesta tabela. Se o par não estiver aqui, ele não existe.

---

## 5. Tons derivados (⚠️ não vêm do branding)

Quatro hexes foram derivados porque a paleta de marca não fornece tinta clara de `erro` nem de `info`, ambos necessários para banners e `bg` de badge. Derivação: mistura do hex semântico com `leite`/`papel` na proporção indicada.

| Token | Hex | Derivação |
|---|---|---|
| `erro-50` | `#F7E6E4` | `#B3261E` a 12% sobre `#FAF7F2` |
| `erro-900` | `#5C1512` | `#B3261E` escurecido 50% (texto sobre `erro-50`, 11.2:1) |
| `info-50` | `#E8EEF2` | `#3A6B8A` a 12% sobre `#FAF7F2` |
| `info-300` | `#8FB6CE` | `#3A6B8A` clareado para uso em dark mode |

Registrados também em `00-overview.md` → "Suposições desta spec".

---

## 6. Proporção de uso (regra anti-carnaval)

Herdada de `03-visual-identity.md` §2.7 e válida por **tela**, não por app:

```
70%  neutros quentes (bg.app, bg.surface, text.*, border.*)
15%  terracota (action.primary, icon.active, brand.primary)
 8%  manjericão (money.in, state.success)
 5%  manteiga + semânticos (badge, banner, ilustração)
```

Se uma tela tem mais de um bloco terracota cheio, um deles vira secundário. Se uma tela tem badge amarelo **e** banner amarelo, um dos dois vira neutro.

---

## 7. Implementação

```ts
// src/config/theme/tokens.ts
import { palette as p } from './palette';

export const lightTokens = {
  bg:     { app: p.neutro.leite, surface: p.neutro.papel,
            surfaceSunken: p.neutro.areia100, surfaceSelected: p.terracota[50],
            overlay: 'rgba(36,30,26,0.45)' },
  border: { default: p.neutro.areia200, strong: p.neutro.areia400,
            focus: p.terracota[600], error: p.semantico.erro,
            subtle: p.neutro.areia100 },
  text:   { primary: p.neutro.grafite900, body: p.neutro.grafite800,
            secondary: p.neutro.cha600, disabled: p.neutro.areia400,
            inverse: p.neutro.papel, link: p.terracota[700] },
  money:  { in: p.manjericao[600], out: p.neutro.grafite800,
            neutral: p.neutro.grafite900, negativeLabel: p.manteiga[700],
            hidden: p.neutro.areia400 },
  // ...action, state, icon conforme §2
} as const;

export type Tokens = typeof lightTokens;
export const darkTokens: Tokens = { /* conforme §3 */ } as any;
```

Consumo obrigatório via hook: `const t = useTokens();` — que lê `useColorScheme()` e devolve `lightTokens | darkTokens`. **Nenhum componente importa `palette` diretamente.**
