# Estilo visual — EmptyState

**Interface (props):** `specs/mobile/design-system/empty-state.md`.
**Tom:** encorajador. O vazio é um convite, não um beco (`02-tone-of-voice.md` §4.6).

---

## 1. Composição e espaçamento

```
                 ↑ 48dp (space.12) ou centralizado no espaço livre
        [ ilustração 160×120  ou  ícone 48dp em círculo 88dp ]
                 ↓ 24dp (space.6)
            "Ainda não tem nada aqui"        h2 · Fraunces 600 20/26 · text.primary
                 ↓ 8dp (space.2)
   "Comece pelo que vocês já pagam todo       body · Inter 400 15/22 · text.secondary
    mês: aluguel, luz, internet, mercado."    máx. 2 linhas · centralizado
                 ↓ 24dp (space.6)
        [ Adicionar uma conta da casa ]       Button primary md · não fullWidth
                 ↓ 48dp
```

| Medida | Valor |
|---|---|
| Largura máxima do bloco de texto | **280dp**, centralizado |
| Alinhamento | **Centralizado** — um dos três únicos lugares do app onde texto centraliza |
| `paddingHorizontal` | 20dp (`space.5`) |
| `paddingVertical` | 48dp (`space.12`) |
| Posicionamento em tela cheia | `flex: 1, justifyContent: 'center'` — o bloco fica no centro óptico, ligeiramente acima do centro geométrico (`paddingBottom: 48` extra) |
| Posicionamento dentro de cartão | `paddingVertical: 32` (`space.8`), sem ilustração — só ícone 32dp |

---

## 2. O visual do topo

Duas apresentações, escolhidas pelo contexto:

### 2.1 Ilustração (tela cheia, momentos importantes)

Onboarding, primeira conexão de banco, família sem membros. Ver `../tokens/elevation-radius-icons.md` §3.6.

- 160×120dp, centralizada, `contentFit="contain"`.
- Formas cheias, sem contorno, paleta restrita da marca, grão 5–8%.
- Cenas domésticas: a mesa com contas em cima, alguém guardando compras, a janela. **Nunca** cofrinho, moeda voando, gráfico subindo.
- Dark mode: `opacity: 0.9`.

### 2.2 Ícone em círculo (vazio de lista, filtro sem resultado)

Padrão para o resto — mais barato e mais discreto.

| Elemento | Light | Dark |
|---|---|---|
| Círculo | 88dp, fundo `#F2EBE1` (areia-100) | 88dp, fundo `#2F2925` |
| Ícone Lucide | 32dp, traço 1.75, cor `#BCB0A2` (areia-400) | 32dp, cor `#6E635C` |

O ícone é **neutro e desbotado** de propósito: o vazio não é um erro, não merece cor de marca nem cor de alerta. A cor da tela vem do botão de ação.

Ícones sugeridos por caso: lista de transações vazia → `Receipt`; nenhuma conta conectada → `Landmark`; filtro sem resultado → `SearchX`; família sem membros → `Users`; nenhuma conta que se repete → `CalendarClock`.

---

## 3. Cores

| Elemento | Light | Dark |
|---|---|---|
| Fundo do bloco | transparente (herda `bg.app` ou `bg.surface`) | transparente |
| `title` | `#241E1A` (14.2:1 ✅) | `#F2EBE3` (15.5:1 ✅) |
| `description` | `#6E635C` (5.6:1 ✅) | `#B0A498` (7.5:1 ✅) |
| Botão de ação | `Button variant="primary" size="md"` | idem |

**O `EmptyState` nunca tem cartão, borda ou fundo próprio em tela cheia.** Dentro de um cartão (ex.: seção vazia do dashboard), ele herda o fundo do cartão e não desenha nada por cima.

---

## 4. Ação

- **Um botão, no máximo.** Se houver uma segunda opção, ela é um `Button variant="ghost"` abaixo do primário, com 8dp de gap.
- `variant="primary"`, `size="md"` (44dp), **não** `fullWidth` — o botão acompanha a largura do próprio label + padding, centralizado. Um botão de largura total num estado vazio pesa demais.
- Label: verbo no infinitivo, começando pela ação, sem ponto final: "Adicionar uma conta da casa", "Conectar meu banco", "Convidar alguém".
- Se `onAction` não é fornecido, o bloco fica sem botão — e a `description` deve então explicar o que fazer em outro lugar.

---

## 5. Microcopy (obrigatório — é onde o estado vazio vive ou morre)

Regras herdadas de `02-tone-of-voice.md`:

| Regra | Exemplo |
|---|---|
| Título curto, sem jargão de banco de dados | ✅ "Ainda não tem nada aqui" · ❌ "Nenhum registro encontrado" |
| Descrição diz **o que** fazer, com exemplo do cotidiano brasileiro | ✅ "Comece pelo que vocês já pagam todo mês: aluguel, luz, internet, mercado." |
| Plural "vocês" quando o assunto é compartilhado | ✅ "Vocês ainda não compartilharam nenhuma conta" |
| Emoji permitido — **um só**, no fim, nunca no início | ✅ "Tudo pronto por aqui 🏠" |
| Nunca culpa, nunca alarme, nunca exclamação dupla | ❌ "Você ainda não cadastrou nada!" |

---

## 6. Movimento

- Entrada: fade 180ms `easing.standard`. Sem slide, sem escala, sem entrada escalonada dos elementos.
- Saída (chegaram dados): cross-fade 180ms para a lista.
- A ilustração não anima. Nada de Lottie em estado vazio.

---

## 7. Acessibilidade

- Container com `accessible={true}` e `accessibilityLabel` = `título + descrição`, para o leitor de tela anunciar o estado de uma vez.
- Ilustração e ícone são decorativos: `accessibilityElementsHidden={true}` / `importantForAccessibility="no-hide-descendants"`.
- Botão mantém seu próprio nó acessível, com `accessibilityRole="button"`.
- O bloco inteiro respeita fonte ampliada até 200%: `maxWidth: 280` no texto, sem altura fixa, e a ilustração encolhe (`maxHeight: 120`) antes do texto quebrar.
