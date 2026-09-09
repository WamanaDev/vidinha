# Estilo visual — ProgressRing

**Interface (props):** `specs/mobile/design-system/progress-ring.md`.
Uso principal: % da fatura do cartão utilizada (`CardInvoiceProgress`).

---

## 1. Geometria

| `size` (dp) | `strokeWidth` (dp) | Tipografia do `label` central | Uso |
|---|---|---|---|
| 32 | 3 | — (sem label; só o anel) | Inline em `ListItem` |
| 48 | 4 | `label-sm` (Inter 500 11/14, tnum) | Cartão compacto |
| **64** (default) | **6** (default) | `body-strong` (Inter 600 15/22, tnum) | Cartão de cartão de crédito |
| 96 | 8 | `h3` (Inter 600 17/24, tnum) | Detalhe de cartão, cabeçalho de tela |
| 128 | 10 | `amount-lg` (Inter 600 24/30, tnum) | Tela de detalhe com valor central |

Regra: `strokeWidth ≈ size / 11`, arredondado para par. Um anel mais grosso que isso vira rosquinha e puxa o app para estética de dashboard.

| Propriedade | Valor |
|---|---|
| Início do arco | **12 horas** (topo), −90° |
| Sentido | Horário |
| `strokeLinecap` | `round` — coerente com os cantos macios da marca |
| Trilho (track) | Círculo completo, mesma `strokeWidth`, sempre visível |
| Label secundário | `caption` em `text.secondary`, 4dp abaixo do label principal, dentro do anel |
| Padding em volta | 8dp mínimo antes de qualquer outro elemento |

Implementação: `react-native-svg` (`<Circle>` com `strokeDasharray` / `strokeDashoffset`), animado por `react-native-reanimated`.

---

## 2. Cores por `tone`

### 2.1 Light

| `tone` | Arco (progresso) | Trilho | Label central |
|---|---|---|---|
| `neutral` | `#B04530` (terracota-600) | `#E5DCD0` (areia-200) | `#241E1A` |
| `success` | `#2F6B4F` (manjericao-600) | `#EEF3EF` (manjericao-50) | `#241E1A` |
| `warning` | `#B77A16` (atencao) | `#FDF3DC` (manteiga-100) | `#241E1A` |
| `danger` | `#B3261E` (erro) | `#F7E6E4` (erro-50) | `#241E1A` |

### 2.2 Dark

| `tone` | Arco | Trilho | Label central |
|---|---|---|---|
| `neutral` | `#E58A70` | `#3D352F` | `#F2EBE3` |
| `success` | `#7FBF9C` | `rgba(127,191,156,0.16)` | `#F2EBE3` |
| `warning` | `#F2B441` | `rgba(242,180,65,0.16)` | `#F2EBE3` |
| `danger` | `#F2B8B5` | `rgba(242,184,181,0.16)` | `#F2EBE3` |

**O label central é sempre `text.primary`**, nunca a cor do `tone`. O anel já carrega a cor; repetir no texto satura e derruba o contraste (`#B77A16` como texto reprova AA — `colors.md` §4).

Contraste do arco contra o fundo (WCAG 1.4.11, mínimo 3:1 para componente gráfico): `#B04530`/`#FFFFFF` = 5.4:1 ✅ · `#B77A16`/`#FFFFFF` = 3.6:1 ✅ · `#2F6B4F`/`#FFFFFF` = 7.0:1 ✅ · `#B3261E`/`#FFFFFF` = 6.5:1 ✅.

---

## 3. Semântica de `tone` — regras de produto

`tone` é **decisão da tela**, não cálculo automático do componente. E a escolha obedece à regra de marca de que gastar não é falha:

| Contexto | `tone` | Motivo |
|---|---|---|
| Fatura de cartão em 0–89% | `neutral` (terracota) | Usar o limite é o uso normal do cartão |
| Fatura em 90–99% | `warning` | Informação útil de proximidade do limite — sem alarme |
| Fatura em 100%+ | `warning` (**não** `danger`) | Limite estourado é situação da conta, não erro de sistema |
| Progresso de meta / poupança | `success` | — |
| Progresso de uma operação do sistema (importação, exportação de dados) | `neutral` | — |
| Falha de uma operação do sistema | `danger` | **Único** uso legítimo de `danger` |

**`tone="danger"` nunca descreve dinheiro.** Ele existe na interface para o caso de uma operação técnica ter falhado no meio (ex.: exportação de dados interrompida). Aplicar `danger` a uma fatura é bug de estilo, tratado como bloqueador de PR — mesma regra do `amount.md` §1.1.

---

## 4. Estados

| Estado | Tratamento |
|---|---|
| `progress = 0` | Só o trilho. Nenhum arco (não desenhar um ponto de `linecap` solto no topo) |
| `progress` entre 0 e 1 | Arco proporcional |
| `progress > 1` | Arco **completo**, e o excedente é comunicado pelo `label` ("112%") + um `Badge tone="warning"` fora do anel. O anel nunca dá uma segunda volta |
| Indeterminado / carregando | **Não usar `ProgressRing`.** Usar `Skeleton` circular do mesmo diâmetro |
| Sem dados | Trilho em `border.subtle`, label `—` em `text.disabled` |

---

## 5. Movimento

- Preenchimento inicial: **320ms** (`duration.slow`) `easing.out`, de 0 até o valor. É a única animação do app que passa de 240ms, justificada por ser um traçado que precisa ser legível.
- Mudança de valor (após sync): transição de 240ms `easing.standard` do valor antigo ao novo.
- Label central: cross-fade de 180ms, **sem contador crescente** — dígitos correndo é o maneirismo que `motion.md` §2 proíbe.
- **Sem rotação, sem pulso, sem brilho.** O anel não é um spinner.
- `useReducedMotion`: o anel aparece já no valor final, sem traçado animado.

---

## 6. Composição canônica — `CardInvoiceProgress`

```
┌──────────────────────────────────────────┐
│  [logo 32]  Nubank · final 4471          │  h3 / caption
│                                          │
│    ⭕ 68%        R$ 3.400,00 de           │  ring 64dp · body-sm text.secondary
│                 R$ 5.000,00               │  amount-lg money.neutral
│                                          │
│  fecha em 3 dias                         │  caption · text.secondary
└──────────────────────────────────────────┘
```

- Anel de 64dp à esquerda, 16dp de gap, bloco de texto à direita em `flex: 1`.
- O valor usado em `amount-lg` / `money.neutral` — **nunca** colorido pelo `tone` do anel.
- "fecha em 3 dias" usa data relativa (`02-tone-of-voice.md` §2). A partir de 7 dias, data absoluta.
- Quando `tone="warning"`, um `Badge tone="warning"` com "perto do limite" aparece ao lado do título — nunca só a cor do anel.

---

## 7. Acessibilidade

- `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 100, now: Math.round(progress*100), text: '68 por cento da fatura usados' }}`.
- O SVG interno é decorativo (`accessibilityElementsHidden`); o container carrega toda a semântica.
- **Cor nunca é o único portador:** o `label` percentual dentro do anel é obrigatório em tamanhos ≥48dp. Em 32dp (sem label), o valor precisa estar em texto ao lado — um anel de 32dp sozinho não é acessível.
- Fonte ampliada: o label central usa `maxFontSizeMultiplier={1.3}` (é o único texto do app com esse limite, porque o container é circular e de tamanho fixo) e o valor completo aparece sempre em texto fora do anel.
