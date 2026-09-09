# Vidinha — Especificação de Design Visual

**Versão:** 1.0
**Escopo:** camada **visual** aplicada sobre o design system funcional já definido em `specs/mobile/design-system/`.
**Depende de (fonte da verdade, não contradiz):**
- `branding/01-brand-strategy.md` — arquétipo Cuidador (70%) + Cara Comum (30%), personalidade, vetos de marca
- `branding/03-visual-identity.md` — paleta, tipografia, logo "O Encontro", iconografia, grid
- `branding/02-tone-of-voice.md` — microcopy, vocabulário fixo, tom por contexto
- `specs/mobile/00-overview.md`, `specs/mobile/design-system/*`, `specs/mobile/navigation.md` — props, estrutura, telas

---

## Como usar esta spec

`specs/mobile/design-system/` define **o que cada componente é**: a interface TypeScript, as props, o contrato de uso. Esta pasta define **como cada componente se parece**: cores exatas por variante e estado, tipografia, padding, raio, elevação e comportamento em dark mode.

```
specs/mobile/design-system/button.md   →  interface ButtonProps { variant, size, loading, ... }
specs/design/components/button.md      →  variant="primary" default = #B04530, pressed = #8F3626,
                                          altura 52dp, raio 14dp, label Inter 600 15/20 em #FFFFFF
```

**As duas camadas são complementares e nenhuma sobrepõe a outra.** Esta spec nunca adiciona, remove ou renomeia uma prop. Se um estilo aqui exigisse uma prop nova, a prop é discutida em `specs/mobile/`, não inventada aqui.

### Ordem de leitura para quem vai implementar

1. `tokens/colors.md`, `tokens/typography.md`, `tokens/spacing-layout.md` — implementar `src/config/theme/` primeiro. Nada mais funciona sem isso.
2. `tokens/elevation-radius-icons.md` e `tokens/motion.md` — completar o objeto de tema.
3. `components/*.md` — um arquivo por componente de `src/components/`, na mesma nomenclatura.
4. `screens/layout-patterns.md` — montar header, tab bar e listas.
5. `screens/dark-mode.md` — auditar cada tela nos dois temas antes de considerá-la pronta.

### Três regras que governam tudo

1. **Nenhum azul como cor primária.** Azul só como cor informativa neutra de sistema.
2. **Fundo nunca é branco puro nem preto puro.** Sempre com temperatura: `#FAF7F2` e `#191512`.
3. **Vermelho é erro de sistema, nunca é gasto.** Despesa é `#3A312C` no light e `#F2EBE3` no dark. Vermelho em valor monetário é bloqueador de PR.

### Regra de implementação

Nenhum componente escreve hex literal nem importa `palette` diretamente. Tudo passa por `useTokens()`, que resolve light/dark. Todo valor de espaçamento vem da escala base-4. Todo estilo dependente de tema é memoizado.

---

## Índice

### Tokens

| Arquivo | Resumo |
|---|---|
| [`tokens/colors.md`](./tokens/colors.md) | Transforma a paleta de marca (terracota, manjericão, manteiga, neutros quentes) em um sistema de tokens semânticos completo para light e dark: `bg.*`, `border.*`, `text.*`, `icon.*`, `brand.*`, `action.*` (primary/secondary/ghost/destructive com todos os estados), `state.*` (success/warning/error/info/neutral, cada um com `fg`/`bg`/`on-bg`) e `money.*` — que codifica a regra de marca de que despesa é preta e vermelho é só erro. Inclui tabela de contraste WCAG AA auditada para as 25 combinações mais usadas, a proporção de uso 70/15/8/5 e a advertência de que `#B77A16` só passa AA como ícone (texto de aviso usa `#8A5F10`). |
| [`tokens/typography.md`](./tokens/typography.md) | Escala completa de 13 níveis mapeando Fraunces (display, h1, h2 — nunca abaixo de 18px) e Inter (h3 para baixo, todo texto de interface), com fonte, peso, tamanho, entrelinha e tracking de cada um, mais uma escala monetária dedicada de 4 níveis com `tabular-nums` obrigatório. Define a receita de hierarquia de tela (máx. 3 níveis visíveis), as regras de acessibilidade tipográfica (escala do sistema até 200%, `minHeight` em vez de `height`) e o snippet pronto de `theme/typography.ts`. |
| [`tokens/spacing-layout.md`](./tokens/spacing-layout.md) | Escala de espaçamento base-4/ritmo-8 (4·8·12·16·20·24·32·48·64) com uso canônico de cada degrau e lista explícita de valores proibidos; margem lateral fixa de 20dp, grid de 4 colunas com calha de 16dp, largura máxima de 560dp em tablet, regras de safe area por tipo de tela, espaçamento de listas (separador como `ItemSeparatorComponent`, nunca margem no item), alvos de toque mínimos de 48×48dp e a tabela consolidada de dimensões fixas de componente. |
| [`tokens/elevation-radius-icons.md`](./tokens/elevation-radius-icons.md) | Raios por componente (8 skeleton · 12 input · 14 botão · 20 cartão · 24 topo de sheet · 999 pílula/avatar) com a regra de aninhamento `raio_externo − padding`; sistema de elevação com sombras quentes de `#3A312C` no light e a regra de que **no dark elevação é cor, não sombra**; e diretrizes de iconografia — Lucide com traço fixo de 1.75dp, grid 24×24, tamanhos 20/24/32/48, cores por estado, quando ícone preenchido é permitido (só a tab ativa) e os ícones de categoria domésticos e brasileiros. |
| [`tokens/motion.md`](./tokens/motion.md) | Durações (100/180/240/320ms, nada além disso) e easings (`cubic-bezier(0.2,0,0,1)` padrão), a tabela de quando usar fade vs. slide sob a regra "slide comunica lugar, fade comunica estado", feedback de toque por componente (botão troca de cor e nunca escala; só `Card` escala, e só 0.985), padrões de loading, uso restrito de háptico e o comportamento obrigatório com `prefers-reduced-motion`. Lista os vetos de marca: sem bounce, sem confete, sem contador de dígitos correndo, sem shake em erro. |

### Componentes (um por arquivo de `specs/mobile/design-system/`)

| Arquivo | Resumo |
|---|---|
| [`components/button.md`](./components/button.md) | Geometria por `size` (36/44/52dp, raio 14), cores completas das quatro variantes em light e dark com todos os estados (default/pressed/disabled/focus/loading), a decisão de que o destrutivo é um ghost vermelho e **nunca** um botão vermelho cheio, ausência total de sombra, e o comportamento de `loading` com largura travada. |
| [`components/text-input.md`](./components/text-input.md) | Campo de 52dp, raio 12, label fixo acima (sem floating label), e o gesto característico: o campo **afunda** em repouso (`areia-100`) e **sobe para branco** ao focar, com borda de 2dp em `terracota-600`. Cores por estado nos dois temas, mensagem de erro em fade sem shake, variações (senha, valor em R$, código MFA, busca, multilinha) e regras de teclado. |
| [`components/card.md`](./components/card.md) | Raio 20dp, borda obrigatória em ambos os temas (o branco sobre o leite tem só 2% de diferença), três níveis de elevação que no dark viram troca de superfície, variações de fundo tingido (dica/sucesso/erro/selecionado), regras de aninhamento, e as duas aplicações canônicas: o cartão de conta com faixa de instituição de 4dp e o cartão de resumo do dashboard. |
| [`components/avatar.md`](./components/avatar.md) | Quatro tamanhos (24/32/40/64dp), fallback de iniciais com fundo **determinístico por hash das iniciais** em 5 tons da marca (todos auditados ≥5.1:1), pilha de avatares sobrepostos com recorte de 2dp para "quem está na família", e a regra de que o indicador de papel nunca é só cor. |
| [`components/badge.md`](./components/badge.md) | Pílula de 24dp com borda de 1dp sempre presente (garante WCAG 1.4.11 sem depender do fundo tingido), cinco `tone` com fundo/texto/borda em light e dark, texto em minúsculas com o vocabulário fixo da marca ("quem organiza", "banco conectado"), e a regra de que `danger` **nunca** descreve dinheiro — saldo negativo é `warning`. |
| [`components/empty-state.md`](./components/empty-state.md) | Bloco centralizado de 280dp com ilustração de 160×120 (momentos importantes) ou ícone de 32dp em círculo neutro de 88dp (vazio de lista), tipografia e cores, um único botão `primary md` não-fullWidth, e as regras de microcopy que fazem o vazio virar convite em vez de beco. |
| [`components/error-state.md`](./components/error-state.md) | Mesma estrutura do empty com ícone em círculo `erro-50` — o único lugar do app onde vermelho ocupa área. Tabela de variação por tipo de erro (só falha de sistema é vermelha; offline e sync são âmbar; sem-permissão e sessão-expirada são neutros), retry em botão secundário, regra de segurança do `errorCode` (só `__DEV__` ou atrás de "Detalhes") e a diferença entre erro de tela, de seção, de mutation (toast) e de campo. |
| [`components/skeleton.md`](./components/skeleton.md) | Base `areia-100` quente (nunca cinza frio, nunca cor de marca), alturas canônicas casadas com a entrelinha real de cada nível tipográfico, shimmer de 1200ms linear com **relógio global compartilhado** entre todas as instâncias visíveis, duração mínima de exibição de 400ms, cross-fade de saída e as receitas de skeleton por tela. |
| [`components/bottom-sheet.md`](./components/bottom-sheet.md) | Raio 24dp só no topo, handle de 36×4, altura máxima de 90%, cores e scrim (mais denso no dark), padrões de conteúdo (lista de opções, confirmação com botão secundário que nunca se chama "Cancelar", rodapé fixo), spring criticamente amortecido sem overshoot e a tabela de quando usar sheet vs. modal vs. tela. |
| [`components/list-item.md`](./components/list-item.md) | A linha mais repetida do app: 64dp (2 linhas) / 56dp (1 linha), divisor recuado a 68dp, título em Inter 600 e subtítulo em `caption`, estados nos dois temas, apresentações canônicas de `leftElement` e `rightElement`, e as consequências de estilo do `React.memo` obrigatório (estilos estáticos ou memoizados, altura previsível para `getItemLayout`). |
| [`components/amount.md`](./components/amount.md) | O componente mais carregado de decisão de marca. Define a regra de cor: entrada em `manjericao`, **saída em `grafite-800` (preto) no light e `#F2EBE3` (creme) no dark**, neutro para saldos, e saldo negativo como número neutro + rótulo em âmbar — nunca vermelho, em nenhuma circunstância. Formatação BRL com `−` U+2212, `tabular-nums` obrigatório, modo privacidade com 4 bullets fixos, e `accessibilityLabel` por extenso ("saíram 187 reais e 40 centavos"). |
| [`components/progress-ring.md`](./components/progress-ring.md) | Cinco tamanhos com `strokeWidth ≈ size/11`, arco começando às 12h com `linecap` redondo, cores de arco e trilho por `tone` nos dois temas, label central sempre em `text.primary` (nunca na cor do tone), a regra de que fatura estourada é `warning` e não `danger`, e a composição canônica do `CardInvoiceProgress`. |

### Telas

| Arquivo | Resumo |
|---|---|
| [`screens/layout-patterns.md`](./screens/layout-patterns.md) | Anatomia padrão de tela (margem 20dp, fundo `bg.app`), header grande com título em Fraunces 26px que colapsa para Inter 17px ao rolar, tab bar de 5 abas com o único uso permitido de ícone preenchido (aba ativa, sempre com cor + peso do label junto), o layout completo do cartão de resumo do dashboard com o valor-herói em Fraunces 34px, configuração padrão de `FlatList`, pull-to-refresh nativo em `terracota-600`, `SectionList` com header não-sticky, formulários e telas de estado puro. |
| [`screens/dark-mode.md`](./screens/dark-mode.md) | As sete coisas que a troca de tokens não resolve sozinha: sombra desligada e elevação virando cor, bordas passando de opcionais a estruturais, opacidade de ilustrações (0.9) e logos de banco sobre selo claro, `text.body` colapsando em `text.primary` por causa do halation, scrim mais denso, as quatro cores semânticas que trocam de tom (com a inversão do texto do botão primário) e os elementos nativos que precisam de ajuste manual (`keyboardAppearance`, `Switch`, `RefreshControl`, splash, webview do Pluggy). Fecha com um checklist de auditoria por tela. |

---

## Suposições desta spec

Decisões tomadas onde o branding e as specs de produto não cobriam. Todas seguem o critério "o que é mais coerente com Cuidador + Cara Comum".

1. **Quatro hexes derivados.** A paleta de marca não fornece tinta clara de `erro` nem de `info`, necessárias para banners e badges. Foram derivados por mistura com o fundo: `erro-50 #F7E6E4`, `erro-900 #5C1512`, `info-50 #E8EEF2` e `info-300 #8FB6CE` (este último para o dark). Registrados em `tokens/colors.md` §5. Nenhuma outra cor foi criada.
2. **`#B77A16` só como ícone.** A auditoria de contraste mostrou 3.4:1 sobre `#FAF7F2` — reprova AA para texto. Decisão: `atencao` é cor de ícone/borda; **texto** de aviso usa `manteiga-700 #8A5F10` (5.3:1). No dark, `#B77A16` é proibido e substituído por `manteiga-400 #F2B441`.
3. **Nível `h3` em Inter, não Fraunces.** O branding proíbe Fraunces abaixo de 18px, e a escala precisava de um nível entre `h2` (20) e `body-lg` (17). Decisão: `h3` = Inter 600 17/24. A serifa fica reservada aos três níveis maiores.
4. **`amount-hero` não é variante do `Amount`.** O valor-herói em Fraunces é uma composição de tela do dashboard, não uma opção genérica do componente — para impedir que a serifa vaze para colunas de valores, onde não tem `tnum` confiável.
5. **Sem toggle de tema no app.** `userInterfaceStyle: 'automatic'`; o app segue o sistema. Um toggle próprio é decisão de produto, não de design, e não está em `specs/mobile/`.
6. **Sem sombra em botão.** O branding define sombra para cartão e sheet, e é omisso sobre botão. Decisão: botão nunca tem sombra — a cor cheia contra o fundo neutro já é hierarquia suficiente, e sombra em botão é o vocabulário de Material Design que a marca rejeita.
7. **Botão não escala ao ser pressionado.** Só `Card` escala (0.985). Encolher um alvo de 52dp durante o gesto o tira da área de toque. Feedback de botão é troca de cor.
8. **`android_ripple` desligado em todo o app.** O ripple do Material é cinza-frio e destoa da paleta quente. Mesmo feedback de cor nas duas plataformas.
9. **Fundo de fallback do `Avatar` é determinístico por hash das iniciais.** Garante que a mesma pessoa tenha a mesma cor em qualquer tela. Não usa e-mail (que pode mudar) nem cor aleatória.
10. **Divisor de lista recuado a 68dp.** Alinhado ao início do texto, não à borda da tela — padrão de lista com avatar/ícone que evita o "degrau" visual.
11. **Header de `SectionList` não é sticky.** Header sticky semitransparente sobre uma coluna de valores em `tnum` cria sobreposição ilegível durante scroll rápido.
12. **Skeleton com relógio de shimmer global e duração mínima de 400ms.** Shimmers dessincronizados fazem a tela "ferver"; um flash de 80ms é mais desconfortável que uma espera honesta.
13. **Badge de contagem numérica especificado sem existir nas props.** É necessário na tab bar. A especificação está em `components/badge.md` §5 para quando a prop for adicionada em `specs/mobile/`.
14. **`allowFontScaling={false}` nas iniciais do `Avatar`** e `maxFontSizeMultiplier` no label da tab bar (1.4) e no label central do `ProgressRing` (1.3). São as três únicas exceções à regra de escala até 200%, todas justificadas por container circular/fixo, e todas com a informação disponível em texto acessível fora do container.
15. **Ícones Lucide nomeados por caso de uso** (`CloudOff`, `Landmark`, `Receipt`, `CalendarClock`, etc.) foram escolhidos aqui; o branding só define a biblioteca e o traço. Ícones de **categoria** continuam sendo pictogramas próprios a desenhar, conforme `03-visual-identity.md` §5.1.
16. **Paleta de 6 cores para categorias definidas pelo usuário** (terracota-500, manjericao-600, manteiga-400, info, cha-600, terracota-700), em `tokens/elevation-radius-icons.md` §3.5 — o produto permite categorias customizadas e a paleta precisava ser restrita para não quebrar a proporção 70/15/8/5.
