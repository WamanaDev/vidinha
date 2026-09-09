# Dark mode — regras gerais de adaptação

**Princípio de marca (`03-visual-identity.md` §2.6):** o dark mode **não é inversão** — é a mesma casa à noite. Base marrom-esverdeada muito escura, nunca `#000000` (que faria o app virar fintech de novo).

**Regra de teste (`03-visual-identity.md` §7.5):** light e dark são testados igualmente. O dark não é "modo secundário" e nenhuma tela sobe sem estar auditada nos dois.

---

## 1. O que a troca de tema NÃO resolve sozinha

Trocar o objeto de tokens resolve cor de texto, fundo e borda. As sete coisas abaixo precisam de decisão explícita em código, e é sobre elas que este documento existe:

1. **Elevação** vira cor, não sombra (§2).
2. **Bordas** passam de opcionais a obrigatórias em vários lugares (§3).
3. **Opacidade** de imagens, logos e ilustrações (§4).
4. **Pesos tipográficos** afinam por causa do halation (§5).
5. **Scrim e overlay** ficam mais densos (§6).
6. **Cores semânticas trocam de tom**, não só de valor (§7).
7. **Elementos nativos** (status bar, teclado, `RefreshControl`, `Switch`, mapa, webview) não seguem o tema automaticamente (§8).

---

## 2. Elevação: sombra some, superfície sobe

No dark, **toda sombra é desligada**: `shadowOpacity: 0`, `elevation: 0`. Sombra em fundo escuro não existe opticamente — o que se enxerga é a superfície mais clara.

| Nível | Light | Dark |
|---|---|---|
| Fundo da tela | `#FAF7F2` | `#191512` |
| Nível 1 — cartão, header, tab bar | `#FFFFFF` + sombra `low` | `#241F1B`, **sem sombra** |
| Nível 2 — bottom sheet, menu, toast | `#FFFFFF` + sombra `medium` | `#2F2925`, **sem sombra** |
| Afundado — input, skeleton, zebra | `#F2EBE1` | `#191512` (afunda para o fundo) |

**Regra do afundado:** no light, o campo de formulário é mais escuro que o cartão; no dark, ele é mais escuro **que o fundo da tela** (ou seja, igual a ele). Em ambos os casos o gesto é o mesmo — o campo afunda em repouso e **sobe para a superfície** ao focar.

**Não existe nível 3.** Se um elemento precisa parecer acima do bottom sheet, ele é um modal de tela cheia.

Única sombra que sobrevive no dark: nenhuma. Única separação disponível: cor + borda.

---

## 3. Bordas: de opcionais a estruturais

No light, `#FFFFFF` sobre `#FAF7F2` já se lê (com ajuda de sombra e borda). No dark, `#241F1B` sobre `#191512` é uma diferença de ~4% de luminância — a borda passa a ser o que define a forma.

| Elemento | Light | Dark |
|---|---|---|
| Cartão | borda 1dp `#E5DCD0` + sombra | **borda 1dp `#3D352F` obrigatória**, sem sombra |
| Bottom sheet | sem borda (sombra basta) | **borda superior 1dp `#3D352F` obrigatória** |
| Header rolado | sombra `low` | **borda inferior 1dp `#3D352F`** |
| Tab bar | borda superior 1dp | borda superior 1dp (igual) |
| Toast | borda 1dp + sombra `medium` | borda 1dp `#3D352F` + fundo `#2F2925` |
| Divisor de lista | 1dp `#F2EBE1` | 1dp `#2F2925` |
| Botão secundário | 1.5dp `#E5DCD0` | 1.5dp `#3D352F` |

Regra prática: **se no light a separação depende de sombra, no dark ela depende de borda.** Nunca as duas, nunca nenhuma.

---

## 4. Imagens, logos e ilustrações

| Ativo | Tratamento no dark |
|---|---|
| **Ilustração da marca** | `opacity: 0.9`. As formas cheias em cores quentes brilham demais sobre `#191512` |
| **Logotipo Vidinha** | Versão monocromática em `#F2EBE3`, ou o símbolo colorido sobre um "selo" de `#241F1B`. **Nunca** o símbolo colorido direto sobre o fundo — a interseção terracota vibra |
| **Logo de instituição financeira** (Pluggy, PNG remoto) | Colocar sobre um quadrado de `#F2EBE3` com raio 8 e 4dp de padding interno. Muitos logos de banco são escuros sobre transparente e sumiriam. **Nunca** aplicar filtro de inversão |
| **Fallback `bank-generic.svg`** | Traço em `#B0A498` sobre círculo `#2F2925` |
| **Avatar com foto** | Sem alteração de opacidade (é rosto de pessoa — escurecer é ofensivo e prejudica reconhecimento) |
| **Ícone de categoria** | Cor `#F2EBE3` (não `#3A312C`); o círculo de fundo passa de `#F2EBE1` para `#2F2925` |
| **Fotografia (marketing in-app)** | `opacity: 0.92` + um véu `rgba(25,21,18,0.08)` por cima |
| **QR code / código de convite** | **Sempre fundo claro `#F2EBE3` com módulos escuros**, mesmo no dark. Leitores de QR falham com QR invertido |

Nenhum ativo é invertido por filtro (`tintColor` global, `filter: invert`). Ou existe uma variante para dark, ou existe um fundo claro sob ele.

---

## 5. Tipografia: afinar, não engordar

Texto claro sobre fundo escuro sofre *halation* — parece mais grosso e mais brilhante do que é. Correções obrigatórias:

1. **`text.body` colapsa em `text.primary`** (`#F2EBE3` para os dois). No light, corpo e título têm cores diferentes (`grafite-800` vs `grafite-900`); no dark, a diferença de 4% se torna ruído e a hierarquia passa a vir **só de tamanho e peso**.
2. **Nunca use `900` nem bold artificial** (`fontWeight: 'bold'` sobre uma fonte já semibold). O peso máximo do app continua sendo 600, e no dark ele já parece 650.
3. **Não aumente tamanhos.** A escala é a mesma nos dois temas.
4. **Texto puro branco (`#FFFFFF`) é proibido** sobre `#191512` (18.4:1 — brilho demais, cansa em leitura longa). O branco do app é `#F2EBE3`, com temperatura, a 15.5:1.
5. Fraunces no dark: os títulos ganham `letterSpacing` de `+0.1` em relação ao light (de −0.2 para −0.1 no `h1`, de −0.4 para −0.3 no `display`) — serifas finas fecham demais em contraste alto.

---

## 6. Scrim, overlay e foco

| Elemento | Light | Dark |
|---|---|---|
| Scrim de modal / sheet | `rgba(36,30,26,0.45)` | `rgba(10,8,7,0.60)` — **mais denso** |
| Véu sobre imagem | `rgba(36,30,26,0.08)` | `rgba(25,21,18,0.08)` |
| Anel de foco | 2dp `#B04530` | 2dp `#E58A70` |
| Seleção de texto | `rgba(176,69,48,0.24)` | `rgba(229,138,112,0.28)` |

O scrim é mais denso no dark porque a diferença entre a superfície do sheet (`#2F2925`) e o fundo (`#191512`) é menor do que a diferença entre `#FFFFFF` e `#FAF7F2` + sombra. Sem isso, o sheet não se descola.

**Estados de seleção e hover** usam **alfa da cor de marca sobre a superfície**, nunca um hex fixo: `rgba(229,138,112,0.14)`. Um hex fixo quebraria quando o mesmo componente aparece sobre `#241F1B` e sobre `#2F2925`.

---

## 7. Cores semânticas: as quatro que mudam de tom

Três cores da paleta **não sobrevivem** ao fundo escuro e são substituídas — não escurecidas nem clareadas por fórmula:

| Papel | Light | Dark | Motivo |
|---|---|---|---|
| Primária de ação | `#B04530` (terracota-600) | `#E58A70` | O 600 dá 2.6:1 sobre `#191512`. E o texto do botão **inverte**: `#FFFFFF` → `#241E1A` |
| Sucesso / entrada | `#2F6B4F` (manjericao-600) | `#7FBF9C` | O 600 dá 1.9:1 — invisível |
| Atenção | `#B77A16` | `#F2B441` (manteiga-400) | O âmbar terroso dá 2.9:1 — **proibido no dark** |
| Erro | `#B3261E` | `#F2B8B5` | O erro escuro dá 2.2:1 |
| Info | `#3A6B8A` | `#8FB6CE` | idem |

**Consequência que se esquece:** quando a cor de marca clareia, **o texto sobre ela escurece**. Todo par `bg`/`fg` inverte junto. Um botão primário no dark é terracota clara com label `#241E1A`.

**A regra do dinheiro atravessa os dois temas intacta:**

| | Light | Dark |
|---|---|---|
| Entrada | `#2F6B4F` | `#7FBF9C` |
| **Saída / despesa** | `#3A312C` (o preto do texto) | `#F2EBE3` (o creme do texto) |
| Neutro | `#241E1A` | `#F2EBE3` |

Ou seja: **no dark, despesa continua sendo a cor neutra do texto.** Ela não vira cinza, não vira terracota, e jamais vira vermelho (`../components/amount.md` §1.1).

---

## 8. Elementos nativos que precisam de ajuste manual

| Elemento | Ajuste |
|---|---|
| Status bar | `<StatusBar style="auto" />` do `expo-status-bar` — resolve pelo esquema. Verificar em telas com header colorido |
| Barra de navegação Android | `NavigationBar.setBackgroundColorAsync('#191512')` + `setButtonStyleAsync('light')` |
| Teclado | `keyboardAppearance="dark"` em **todo** `TextInput` quando o esquema é dark. Sem isso, um teclado branco explode na tela |
| `RefreshControl` | `tintColor` e `colors` = `#E58A70`; `progressBackgroundColor` = `#241F1B` |
| `Switch` | `trackColor.true` = `#E58A70`, `trackColor.false` = `#3D352F`, `thumbColor` = `#F2EBE3`, `ios_backgroundColor` = `#3D352F` |
| Seletor de data/hora nativo | `themeVariant="dark"` (iOS) |
| Webview do Pluggy Connect | **Não é nossa.** Renderizar sobre fundo `#FFFFFF` com uma barra de header própria em `#241F1B`, e não tentar forçar dark dentro dela |
| `ActivityIndicator` | `color` = `#E58A70` |
| Splash screen | Variante própria em `app.config.ts` (`android.splash.dark`, `ios.splash.dark`) com fundo `#191512` |
| Toast / snackbar | `bg.surface-raised` (`#2F2925`), sem sombra, com borda |

---

## 9. Implementação

```ts
// src/config/theme/useTokens.ts
import { useColorScheme } from 'react-native';
import { lightTokens, darkTokens } from './tokens';

export function useTokens() {
  const scheme = useColorScheme();          // segue o sistema
  return scheme === 'dark' ? darkTokens : lightTokens;
}
export function useIsDark() { return useColorScheme() === 'dark'; }
```

Regras de implementação:

1. `userInterfaceStyle: 'automatic'` em `app.config.ts` (iOS e Android). O app **segue o sistema**; não há toggle próprio no MVP.
2. Nenhum componente importa `palette` nem escreve hex literal. Só `useTokens()`.
3. Estilos que dependem do tema vêm de `useMemo(() => createStyles(t), [t])` — obrigatório em `ListItem` para não quebrar o `React.memo` (`../components/list-item.md` §6).
4. `elevation` e `shadowOpacity` são **valores de token**, não constantes: no `darkTokens` eles valem 0.
5. Não usar `Appearance.setColorScheme()` para forçar tema — quebra a expectativa do sistema.

---

## 10. Checklist de auditoria de dark mode (por tela, obrigatório no PR)

- [ ] O fundo é `#191512`? (Se aparecer `#000000` em qualquer lugar → bloqueador)
- [ ] Existe `#FFFFFF` como cor de texto ou de superfície grande? → trocar por `#F2EBE3` / `#241F1B`
- [ ] Toda sombra está desligada (`shadowOpacity: 0`, `elevation: 0`)?
- [ ] Todo cartão, sheet e header rolado tem borda `#3D352F`?
- [ ] `#B77A16` aparece em algum lugar? → **proibido no dark**, usar `#F2B441`
- [ ] O botão primário tem label **escuro** (`#241E1A`) sobre terracota clara?
- [ ] Alguma despesa está colorida? → deve ser `#F2EBE3`
- [ ] Logos de banco estão sobre fundo claro?
- [ ] `keyboardAppearance="dark"` em todos os inputs da tela?
- [ ] Ilustração com `opacity: 0.9`?
- [ ] Todos os pares texto/fundo ≥4.5:1 (≥3:1 para ícone)? Conferir em `../tokens/colors.md` §4
- [ ] A tela foi vista de fato no dark, não só inferida?
