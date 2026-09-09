# Tokens de tipografia — Vidinha

**Fonte da verdade:** `branding/03-visual-identity.md` §3.
**Famílias:** **Fraunces** (display/títulos) + **Inter** (texto/interface). Ambas SIL OFL, ambas via `@expo-google-fonts`.

---

## 1. As duas famílias e a linha divisória

| | Fraunces | Inter |
|---|---|---|
| **Papel** | Voz da marca: títulos, valor-herói, logotipo | Trabalho: tudo que se lê, se toca ou se compara |
| **Pesos carregados** | 600 (Semibold), 400 (Regular, só para citação grande) | 400, 500, 600 |
| **Eixos variáveis** | `SOFT 40`, `WONK 1` (fixos — não expor no código) | — |
| **Regra de corte** | **Nunca abaixo de 18px.** Nunca em texto corrido, rótulo, tabela ou input | Padrão para todo o resto |
| **Fallback** | `Georgia, 'Times New Roman', serif` | `-apple-system, 'SF Pro Text', 'Roboto', system-ui, sans-serif` |

**Regra fixa de dinheiro:** todo valor monetário usa `fontVariant: ['tabular-nums']` (Inter `tnum`) **e** peso ≥ 600. Sem exceção — colunas de R$ não podem dançar.

**Proibido:** caixa alta com `letterSpacing` positivo em rótulos (maneirismo de dashboard corporativo). `textTransform: 'uppercase'` só em siglas já escritas assim.

---

## 2. Escala tipográfica completa

`sp` = a unidade escala com a fonte do sistema (React Native já faz isso por padrão com `allowFontScaling`). Tracking em px absolutos.

| Token | Fonte | Peso | Tamanho | Entrelinha | Tracking | Uso |
|---|---|---|---|---|---|---|
| `display` | Fraunces | 600 | 34 | 40 | −0.4 | Valor-herói do dashboard ("R$ 4.280 este mês"), primeira tela de onboarding |
| `h1` | Fraunces | 600 | 26 | 32 | −0.2 | Título de tela (header grande, primeira linha do scroll) |
| `h2` | Fraunces | 600 | 20 | 26 | 0 | Título de seção dentro da tela, título de bottom sheet |
| `h3` | **Inter** | 600 | 17 | 24 | −0.1 | Sub-seção, título de cartão, título de `ListItem` em destaque. **Inter porque 17 < 18** |
| `body-lg` | Inter | 400 | 17 | 26 | 0 | Onboarding, textos explicativos, corpo de `EmptyState` |
| `body` | Inter | 400 | 15 | 22 | 0 | **Padrão.** Corpo, `ListItem.title`, descrição |
| `body-strong` | Inter | 600 | 15 | 22 | 0 | Ênfase dentro de corpo, nome de conta em lista |
| `body-sm` | Inter | 400 | 13 | 18 | 0 | Texto auxiliar denso, `ListItem.subtitle` longo |
| `label` | Inter | 500 | 13 | 18 | 0 | Label de input, categoria, metadado, texto de `Badge` |
| `label-sm` | Inter | 500 | 11 | 14 | 0.2 | Label da tab bar, contador de badge |
| `caption` | Inter | 400 | 12 | 16 | 0 | Data, nota de rodapé, mensagem de erro de campo. **Mínimo absoluto** |
| `button` | Inter | 600 | 15 | 20 | 0 | Label de botão `md`/`lg` |
| `button-sm` | Inter | 600 | 13 | 18 | 0 | Label de botão `sm` |

### 2.1 Escala monetária (derivada, com `tnum` obrigatório)

| Token | Fonte | Peso | Tamanho | Entrelinha | Tracking | Uso |
|---|---|---|---|---|---|---|
| `amount-hero` | **Fraunces** | 600 | 34 | 40 | −0.4 | Valor-herói do resumo do mês. Único valor em serifa |
| `amount-lg` | Inter | 600 | 24 | 30 | −0.2 | `Amount variant="large"`: saldo de conta, total de fatura |
| `amount` | Inter | 600 | 15 | 22 | 0 | `Amount variant="default"`: coluna de R$ em lista |
| `amount-compact` | Inter | 500 | 13 | 18 | 0 | `Amount variant="compact"`: valor secundário, dentro de badge |

> `amount-hero` é a **única** exceção à regra "Fraunces não faz número tabular": em um valor isolado e centralizado não há coluna para desalinhar. Em qualquer contexto com dois ou mais valores empilhados, use `amount-lg` (Inter).

---

## 3. Hierarquia aplicada — receita de tela padrão

```
[header]        h1        Fraunces 600 26/32   text.primary
[subtítulo]     body      Inter 400 15/22      text.secondary
                ↓ space-6 (24)
[seção]         h2        Fraunces 600 20/26   text.primary
                ↓ space-3 (12)
[cartão]
  título        h3        Inter 600 17/24      text.primary
  linha         body      Inter 400 15/22      text.body
  metadado      caption   Inter 400 12/16      text.secondary
  valor         amount    Inter 600 15/22 tnum money.*
```

**Máximo de três níveis tipográficos visíveis por tela.** Se a tela precisa de um quarto, a hierarquia está errada — resolva com espaçamento ou com cartão, não com um tamanho novo.

---

## 4. Acessibilidade tipográfica

1. **Escala do sistema até 200%.** Nenhum contêiner de texto tem `height` fixa — use `minHeight` + `paddingVertical`. Isso vale especialmente para `Button` (altura 52 vira `minHeight: 52`) e `ListItem`.
2. `allowFontScaling` fica **ligado** (default) em tudo. A única exceção permitida é o label da tab bar, que usa `maxFontSizeMultiplier={1.4}` para não quebrar o layout de 5 abas.
3. `numberOfLines` nunca é aplicado a valores em R$ — trunque o título, nunca o número.
4. `caption` (12px) é o piso. Nada abaixo disso existe no app.
5. Line-height é sempre valor absoluto em px, nunca multiplicador — Android e iOS arredondam multiplicadores de forma diferente.

---

## 5. Implementação

```ts
// src/config/theme/typography.ts
import { Platform, TextStyle } from 'react-native';

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayRegular: 'Fraunces_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

const tnum: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display:      { fontFamily: fonts.display,      fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  h1:           { fontFamily: fonts.display,      fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  h2:           { fontFamily: fonts.display,      fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  h3:           { fontFamily: fonts.sansSemiBold, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  bodyLg:       { fontFamily: fonts.sans,         fontSize: 17, lineHeight: 26 },
  body:         { fontFamily: fonts.sans,         fontSize: 15, lineHeight: 22 },
  bodyStrong:   { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22 },
  bodySm:       { fontFamily: fonts.sans,         fontSize: 13, lineHeight: 18 },
  label:        { fontFamily: fonts.sansMedium,   fontSize: 13, lineHeight: 18 },
  labelSm:      { fontFamily: fonts.sansMedium,   fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  caption:      { fontFamily: fonts.sans,         fontSize: 12, lineHeight: 16 },
  button:       { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20 },
  buttonSm:     { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18 },

  amountHero:   { fontFamily: fonts.display,      fontSize: 34, lineHeight: 40, letterSpacing: -0.4, ...tnum },
  amountLg:     { fontFamily: fonts.sansSemiBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.2, ...tnum },
  amount:       { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22, ...tnum },
  amountCompact:{ fontFamily: fonts.sansMedium,   fontSize: 13, lineHeight: 18, ...tnum },
} satisfies Record<string, TextStyle>;
```

Carregamento (bloqueia o splash até resolver — evita flash de fallback serifado):

```ts
useFonts({
  Fraunces_400Regular, Fraunces_600SemiBold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
});
```

Subset `latin` + `latin-ext`. **Não carregar peso que não esteja na tabela §2** — cada peso extra da Fraunces custa ~40 KB no bundle.

**Fallback aprovado** se a Fraunces pesar demais no bundle ou renderizar mal em Android < 9: **Bricolage Grotesque** 600 nos mesmos tamanhos, com tracking ajustado para 0 (a Bricolage já é estreita). Proibidas: Poppins, Montserrat, Nunito, Quicksand.
