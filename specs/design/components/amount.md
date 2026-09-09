# Estilo visual — Amount

**Interface (props):** `specs/mobile/design-system/amount.md`.

> Este é o componente mais carregado de decisão de marca do app. A regra que o governa vem de `03-visual-identity.md` §2.5 e `01-brand-strategy.md`:
>
> **Vermelho é erro de sistema, não é gasto. Gastar dinheiro é normal; a interface não pode tratar isso como falha.**

---

## 1. A regra de cor (a decisão central)

| Situação | Token | Light | Dark | Sinal obrigatório |
|---|---|---|---|---|
| **Entrada / receita** | `money.in` | `#2F6B4F` (manjericao-600) | `#7FBF9C` | `+` |
| **Saída / despesa** | `money.out` | **`#3A312C` (grafite-800)** | **`#F2EBE3`** | `−` (menos tipográfico U+2212) |
| **Neutro** (saldo, total, fatura, valor sem direção) | `money.neutral` | `#241E1A` (grafite-900) | `#F2EBE3` | nenhum |
| **Oculto** (`hideValue`) | `money.hidden` | `#BCB0A2` (areia-400) | `#6E635C` | — |

### 1.1 Despesa é preta. Ponto.

`money.out` = `#3A312C` no light e `#F2EBE3` no dark. **Nenhum tom de vermelho, laranja ou terracota é aplicado a uma despesa, em nenhuma circunstância**, incluindo:

- gasto acima da média do mês;
- gasto de categoria "cara";
- despesa não categorizada;
- fatura de cartão alta;
- despesa compartilhada não paga.

Vermelho (`#B3261E`) em um valor monetário é **bug de estilo**, tratado como bloqueador de PR.

### 1.2 Saldo negativo

Um saldo negativo **não é uma despesa nem um erro** — é um estado da conta.

```
R$ −62,30              amount-lg · money.neutral (#241E1A / #F2EBE3)
saldo negativo         caption   · money.negative-label (#8A5F10 / #F2B441)
```

- O número fica em `money.neutral`, **com o sinal `−`**.
- Um rótulo textual em `caption` (`money.negative-label`) aparece logo abaixo ou ao lado. É esse rótulo que carrega a informação — não a cor.
- Microcopy: "saldo negativo", "faltam R$ 62,30". **Nunca** "prejuízo", "rombo", "no vermelho" (`02-tone-of-voice.md` §2).

### 1.3 `colorByValue`

A prop `colorByValue` significa: **positivo → `money.in`, negativo → `money.out`**. Não "positivo verde, negativo vermelho". A implementação precisa refletir isso literalmente:

```ts
const color = !colorByValue
  ? t.money.neutral
  : value > 0 ? t.money.in
  : value < 0 ? t.money.out   // ← grafite-800, NUNCA erro
  : t.money.neutral;          // zero é neutro
```

Zero é sempre `money.neutral` (não é entrada nem saída).

**`colorByValue` fica desligado por default** e só é ligado em contextos onde a direção do dinheiro é a informação principal: lista de lançamentos, detalhe de transação, resumo de entradas × saídas. Em saldos e totais consolidados fica desligado — um saldo positivo não precisa ser verde.

---

## 2. Tipografia por `variant`

| `variant` | Estilo | Fonte / peso / tamanho | Uso |
|---|---|---|---|
| `compact` | `amount-compact` | Inter 500 · 13/18 · `tnum` | Valor secundário, dentro de badge, coluna densa |
| `default` | `amount` | Inter 600 · 15/22 · `tnum` | **Padrão.** Coluna de R$ em lista |
| `large` | `amount-lg` | Inter 600 · 24/30 · `tnum`, tracking −0.2 | Saldo de conta, total de fatura, cabeçalho de detalhe |

**Valor-herói do dashboard** (`amount-hero`: Fraunces 600 34/40 tnum) **não é uma variante deste componente** — é uma composição de tela específica documentada em `../screens/layout-patterns.md` §4. Justificativa: é o único valor em serifa do app e não deve estar disponível como opção genérica.

`fontVariant: ['tabular-nums']` é obrigatório em **todas** as variantes, sem exceção. Sem `tnum`, colunas de valores dançam a cada dígito diferente.

---

## 3. Formatação (BRL)

| Regra | Exemplo |
|---|---|
| Formato padrão | `R$ 1.240,90` — sempre com `R$`, separador de milhar e centavos |
| Espaço estreito | `R$ 1.240` (sem centavos) — permitido só em `compact` e em push |
| Nunca | `1240.90`, `R$1240,90`, `1,24k`, `R$ 1,2 mil` |
| Sinal | `−` (U+2212, menos matemático), **não** hífen `-`. O `−` tem a mesma largura do dígito em `tnum` e alinha a coluna |
| Sinal positivo | `+` só quando `colorByValue` está ligado e há entradas e saídas na mesma lista |
| Posição do sinal | Antes do `R$`: `− R$ 187,40`. Espaço fino entre sinal e `R$` (4dp de gap, não caractere de espaço) |
| Implementação | `Intl.NumberFormat('pt-BR', { style:'currency', currency: currency ?? 'BRL' })`, com o sinal removido e reaplicado manualmente |
| Alinhamento em coluna | `textAlign: 'right'` |
| `numberOfLines` | **Nunca aplicado.** Um valor jamais é truncado — o título ao lado é que cede espaço |

### 3.1 Símbolo `R$`

Renderizado no **mesmo estilo** do número, sem cor nem tamanho diferentes. Sem `R$` menor, sem `R$` sobrescrito, sem centavos em corpo menor — esses maneirismos são de app de banco e de e-commerce.

---

## 4. `hideValue` (modo privacidade)

| Elemento | Especificação |
|---|---|
| Conteúdo | `R$ ••••` — o `R$` **permanece visível**, os dígitos viram bullets (U+2022) |
| Quantidade de bullets | **Sempre 4**, independente da magnitude real. Variar a contagem vaza a ordem de grandeza |
| Cor | `money.hidden` — `#BCB0A2` (light) / `#6E635C` (dark) |
| Tipografia | Mesma da `variant`, com `letterSpacing: 2` para os bullets respirarem |
| Sinal | Suprimido — `+`/`−` também vaza informação |
| Largura | O componente mantém a largura que o valor real teria (`minWidth` medido), para a lista não reflui ao alternar |
| Transição | Cross-fade 180ms `easing.standard` ao ligar/desligar |

`hideValue` é decisão de tela (uma toggle global no header do dashboard), nunca de item individual.

---

## 5. Comportamento em dark mode

- `money.out` inverte para `#F2EBE3` (o texto padrão): a despesa continua sendo **a cor neutra do texto**, que é o princípio. Não vira cinza nem terracota.
- `money.in` sobe para `#7FBF9C` (o `#2F6B4F` some no escuro, 1.9:1).
- `money.negative-label` sobe para `#F2B441` (o `#8A5F10` reprova no escuro).
- Contrastes: `#7FBF9C`/`#191512` = 8.5:1 ✅; `#F2EBE3`/`#191512` = 15.5:1 ✅; `#F2B441`/`#191512` = 10.0:1 ✅.
- No dark, entrada e saída ficam **mais próximas visualmente** (verde claro vs. creme). Isso é aceitável e até desejado — o sinal `+`/`−` é o portador primário. Ver §6.

---

## 6. Acessibilidade — cor nunca é o único portador

Regra de `03-visual-identity.md` §7.2: terracota × manjericão é um par de risco em deuteranopia, e 8% dos homens têm alguma deficiência de visão de cores.

1. **O sinal `+`/`−` é obrigatório** sempre que `colorByValue` estiver ligado. Nunca "verde é entrada, e pronto".
2. Em contextos onde o sinal seria estranho, um `label` textual ("entrou" / "saiu") acompanha o valor em `caption`/`text.secondary`.
3. `accessibilityLabel` por extenso, em português, **sem símbolos**:
   - entrada: `"entraram 3.200 reais"`
   - saída: `"saíram 187 reais e 40 centavos"`
   - neutro: `"4.280 reais e 15 centavos"`
   - negativo: `"saldo negativo de 62 reais e 30 centavos"`
   - oculto: `"valor oculto"`
   Nunca "menos 187 reais" nem "R cifrão 187".
4. `accessibilityRole="text"`. O `Amount` nunca é interativo por si — quem recebe o toque é o `ListItem` ou o `Card` em volta.
5. `allowFontScaling` ligado, sem `maxFontSizeMultiplier`. Se o valor não couber com fonte a 200%, o layout quebra a linha — o número nunca encolhe nem trunca.

---

## 7. Checklist de PR

- [ ] Algum valor monetário está usando `state.error` / `#B3261E` / `#F2B8B5`? → **bloqueador**
- [ ] `fontVariant: ['tabular-nums']` presente?
- [ ] O sinal é `−` (U+2212) e não hífen?
- [ ] `colorByValue` está ligado em um saldo ou total? → deveria estar desligado
- [ ] `hideValue` mostra sempre 4 bullets?
- [ ] `accessibilityLabel` está por extenso, sem símbolos?
- [ ] Existe `numberOfLines` no valor? → remova
