# Vidinha — Direção de Identidade Visual

**Versão:** 1.0
**Depende de:** `01-brand-strategy.md` (Cuidador + Cara Comum; território doméstico, não financeiro)
**Escopo:** direção e sistema. Não é arte-final — é a especificação que o designer executa.
**Plataforma primária:** app React Native + Expo (mobile-first, iOS + Android)

---

## 1. A tese visual

Todo app financeiro brasileiro cabe hoje em uma de três estéticas: **azul institucional** (bancos), **roxo/neon sobre preto** (fintechs) ou **verde de planilha** (apps de controle). As três são frias, todas dizem "dinheiro", e nenhuma diz "casa".

A Vidinha ocupa um espaço vazio: **a estética da casa arrumada**. Referências não são fintechs — são o material de marcas de cozinha, casa e cuidado (barro, linho, luz de fim de tarde, cerâmica, papel de boa gramatura). O rigor vem da tipografia e do grid, não da frieza da cor.

**Regras que amarram tudo:**
1. **Nenhum azul como cor primária.** Azul aparece só como cor informativa neutra, em componentes de sistema.
2. **Fundo nunca é branco puro nem preto puro.** Sempre com temperatura.
3. **Cor é economia:** o dinheiro na tela é preto sobre creme. Cor serve para orientar, não para decorar.
4. **Vermelho é erro de sistema, não é gasto.** Gastar dinheiro é normal; a interface não pode tratar isso como falha.

---

## 2. Paleta

### 2.1 Primária — Terracota

A cor da marca. Barro, telha, panela de barro, tijolo — quente, doméstica, brasileira e completamente ausente da categoria financeira. Terracota é séria (é uma cor terrosa, não uma cor de doce) sem ser corporativa: resolve o pedido de "confiança sem frieza" melhor que qualquer laranja ou coral, que puxariam para energia/promoção.

| Token | Hex | Uso |
|---|---|---|
| `terracota-50` | `#FBF0EC` | Fundos de destaque, chips selecionados |
| `terracota-100` | `#F6DDD4` | Estados hover suaves, ilustração |
| `terracota-300` | `#E09B85` | Bordas ativas, gráficos |
| `terracota-500` | `#C9553D` | **Cor da marca.** Logotipo, ícones de destaque, gráficos |
| `terracota-600` | `#B04530` | **Botão primário** (contraste 5.4:1 com branco — AA para texto normal) |
| `terracota-700` | `#8F3626` | Pressionado, links sobre fundo claro |
| `terracota-900` | `#54211A` | Texto sobre fundos terracota claros |

> ⚠️ Regra de acessibilidade: `terracota-500` **não** passa AA para texto pequeno sobre branco. Botões e links usam **600**. O 500 fica para superfícies, ícones grandes (≥24px) e o próprio logotipo.

### 2.2 Secundária — Verde Manjericão

O contraponto sério. Verde profundo e acinzentado (não neon, não "verde dinheiro", não verde de planilha). Traz calma, permanência e a única associação positiva que queremos manter da categoria: crescimento e "está tudo certo".

| Token | Hex | Uso |
|---|---|---|
| `manjericao-50` | `#EEF3EF` | Fundo de confirmação, cartões de entrada |
| `manjericao-300` | `#8FB39C` | Gráficos, ilustração |
| `manjericao-600` | `#2F6B4F` | **Entradas/receitas, sucesso, escudo de segurança** (7.0:1 com branco) |
| `manjericao-800` | `#1D4433` | Textos e ícones sobre verde claro |

### 2.3 Acento — Amarelo Café da Manhã

Usar com parcimônia (< 5% da tela). É o sol na cozinha: destaque, empty states, ilustração, badge de novidade. **Nunca** como cor de texto e **nunca** como alerta.

| Token | Hex | Uso |
|---|---|---|
| `manteiga-100` | `#FDF3DC` | Fundos de dica, banner informativo |
| `manteiga-400` | `#F2B441` | Ilustração, badge, gráfico de terceira série |
| `manteiga-700` | `#8A5F10` | Texto sobre `manteiga-100` |

### 2.4 Neutros quentes (a base real do produto)

**90% da interface é isto aqui.** Todos os cinzas têm matiz quente (~30°) — é o que impede o app de parecer um dashboard.

| Token | Hex | Uso |
|---|---|---|
| `leite` | `#FAF7F2` | **Fundo padrão do app** (nunca `#FFFFFF`) |
| `papel` | `#FFFFFF` | Cartões e superfícies elevadas sobre o `leite` |
| `areia-100` | `#F2EBE1` | Fundo de campo, linha zebrada |
| `areia-200` | `#E5DCD0` | **Bordas e divisores** |
| `areia-400` | `#BCB0A2` | Ícones desabilitados, placeholder |
| `cha-600` | `#6E635C` | **Texto secundário** (5.6:1 sobre `leite`) |
| `grafite-800` | `#3A312C` | Texto de corpo |
| `grafite-900` | `#241E1A` | **Títulos e valores em R$** (14.2:1 sobre `leite`) |

### 2.5 Semânticos

Deliberadamente separados das cores da marca, para que "alerta" nunca seja confundido com "identidade".

| Token | Hex | Significado | Regra |
|---|---|---|---|
| `positivo` | `#2F6B4F` | Entrada de dinheiro, sucesso, conexão ativa | = `manjericao-600` |
| `atencao` | `#B77A16` | Conta a vencer, sincronização pendente | Âmbar terroso, nunca amarelo puro |
| `erro` | `#B3261E` | **Só erro de sistema e ação destrutiva** | ❌ Nunca para despesa ou saldo negativo |
| `info` | `#3A6B8A` | Componentes informativos de sistema | Único azul do sistema; nunca de marca |
| `neutro-saida` | `#3A312C` | **Saídas e despesas** | = `grafite-800`. Gasto é preto, não vermelho |

**Saldo negativo:** número em `grafite-900` com o sinal, mais um rótulo em `atencao`. Nunca em `erro`.

### 2.6 Modo escuro

Não é inversão: é a mesma casa à noite. Base marrom-esverdeada muito escura, nunca `#000000` (que faria o app virar fintech de novo).

| Token | Hex |
|---|---|
| `dark/fundo` | `#191512` |
| `dark/superficie` | `#241F1B` |
| `dark/superficie-2` | `#2F2925` |
| `dark/borda` | `#3D352F` |
| `dark/texto` | `#F2EBE3` |
| `dark/texto-secundario` | `#B0A498` |
| `dark/terracota` | `#E58A70` (o 500 clareia — o 600 escuro não tem contraste) |
| `dark/manjericao` | `#7FBF9C` |
| `dark/erro` | `#F2B8B5` |

### 2.7 Proporção de uso (a regra que evita o app "carnavalesco")

```
70%  neutros quentes (leite, papel, areia, grafite)
15%  terracota
 8%  manjericão
 5%  manteiga + semânticos
```

---

## 3. Tipografia

Duas famílias, ambas no Google Fonts, ambas com licença SIL OFL (uso comercial e embarque no app liberados) e ambas com suporte completo a português.

### 3.1 Display / Títulos — **Fraunces**

Serifa "soft" contemporânea, com eixos variáveis `SOFT` e `WONK`. É a decisão mais importante deste documento: uma serifa carrega credibilidade e permanência (coisa que sans-serif geométrica não faz), enquanto o desenho arredondado da Fraunces e seu ar levemente doméstico/editorial evitam o formalismo de um banco. É o equivalente tipográfico exato de "afetivo mas confiável".

- **Pesos:** 600 (Semibold) para títulos, 400 para citações grandes
- **Eixos:** `SOFT 40`, `WONK 1` — mantém o charme sem virar caricatura
- **Onde:** logotipo, títulos de tela, números-herói do resumo do mês, títulos de e-mail, marketing
- **Onde NÃO:** texto corrido, rótulos, tabelas, qualquer coisa abaixo de 18px
- **Fallback:** `Georgia, 'Times New Roman', serif`

### 3.2 Texto / Interface — **Inter**

Escolhida por trabalho, não por moda: tem **algarismos tabulares** (`font-feature-settings: 'tnum' 1`) — obrigatório para colunas de valores em R$ não dançarem —, ótima legibilidade em 13–15px em telas densas, e um desenho neutro que deixa a Fraunces ser a voz. Neutro aqui é virtude: a personalidade vem do título e da cor.

- **Pesos:** 400 (corpo), 500 (rótulo), 600 (ênfase e valores)
- **Regra fixa:** todo valor monetário usa `tnum` + peso 600
- **Fallback:** `-apple-system, 'SF Pro Text', 'Roboto', system-ui, sans-serif`

**Alternativa aceitável** se a Fraunces pesar demais no bundle ou renderizar mal em Android antigo: **Bricolage Grotesque** (display) + **Inter**. Não usar Poppins, Montserrat, Nunito ou Quicksand — Poppins/Montserrat são o default genérico de startup; Nunito/Quicksand infantilizam e destroem a credibilidade que dado bancário exige.

### 3.3 Escala tipográfica (mobile)

| Papel | Fonte / peso | Tamanho / entrelinha | Uso |
|---|---|---|---|
| Display | Fraunces 600 | 34 / 40 | Valor-herói ("R$ 4.280 este mês") |
| Título 1 | Fraunces 600 | 26 / 32 | Título de tela |
| Título 2 | Fraunces 600 | 20 / 26 | Título de seção |
| Corpo grande | Inter 400 | 17 / 26 | Onboarding, textos explicativos |
| Corpo | Inter 400 | 15 / 22 | Padrão |
| Valor em lista | Inter 600 `tnum` | 15 / 22 | Coluna de R$ |
| Rótulo | Inter 500 | 13 / 18 | Categorias, metadados |
| Legenda | Inter 400 | 12 / 16 | Data, nota de rodapé. **Mínimo absoluto** |

Sem caixa alta com letter-spacing em rótulos — é maneirismo de dashboard corporativo.

---

## 4. Logotipo — 3 conceitos

Todos partem da mesma base: **wordmark em Fraunces 600, minúsculas** — `vidinha`. Minúscula é decisão de marca: o diminutivo é íntimo, e a caixa alta o contradiz.

### Conceito A — "O telhado no i"

O pingo do **i** vira uma pequena forma de telhado (dois traços em ângulo) ou de casa arredondada. O símbolo nasce dentro da palavra: nada é acrescentado, algo é substituído.

- **Prós:** elegante, memorável, comunica "casa" de imediato; wordmark autossuficiente sem símbolo separado.
- **Contras:** frágil abaixo de ~80px de largura; sem símbolo isolado forte, o ícone de app fica sendo só a letra "v"; a metáfora "casa" é a mais explorada do setor imobiliário/doméstico.

### Conceito B — "O laço"

Monograma de uma linha contínua que descreve um "v" e, ao se cruzar, forma um pequeno nó/laço — duas vidas amarradas por um fio só.

- **Prós:** metáfora bonita de união; linha contínua é elegante em animação.
- **Contras:** **o "laço/nó" é lugar-comum de marca de casamento e de aliança** — empurra a marca para o nicho de casal romântico, quando o produto atende também mãe e filha, irmãos e famílias recompostas. Traço fino some em 16px. **Descartado.**

### Conceito C — "O encontro" ✅ **RECOMENDADO**

Duas formas arredondadas (dois "seixos" de cantos macios, quase um Venn de bordas suaves) que se sobrepõem. A área de interseção é uma terceira forma, cheia, em `terracota-500`; as duas formas externas ficam em `manjericao-600` e `manteiga-400` (ou em translucidez que gera a terceira cor). A silhueta geral sugere um "v" ou duas cabeças lado a lado, dependendo do ângulo.

- **Prós:**
  - **Codifica literalmente o modelo do produto:** cada pessoa mantém o que é seu, e o que é compartilhado é a interseção — que é a parte cheia, colorida, a coisa mais importante da tela. Nenhum concorrente tem um símbolo que explica o produto.
  - Escala perfeitamente: legível em 16px de favicon e em 1024px de ícone de loja; funciona em 1 cor, em preto sobre branco e em relevo.
  - Sobrevive à evolução do produto: com **três** formas sobrepostas ele representa família de N pessoas sem redesenho (`specs/00-DECISIONS.md` §1: 2 a N integrantes).
  - Não é casa, não é coração, não é cifrão, não é gráfico — foge dos quatro clichês da categoria de uma vez.
- **Contras:** o Venn é uma forma conhecida; o desenho precisa ser distintivo nos raios e na proporção para não parecer diagrama. Mitigação: formas assimétricas, cantos orgânicos (nunca dois círculos perfeitos), e a interseção com leve deslocamento — deve parecer duas mãos se cruzando, não uma aula de teoria dos conjuntos.

### Sistema recomendado

| Aplicação | Composição |
|---|---|
| Logotipo principal | símbolo "encontro" à esquerda + wordmark `vidinha` (Fraunces 600, `grafite-900`) |
| Ícone do app / avatar | símbolo isolado, sobre fundo `leite`, cantos do ícone conforme a plataforma |
| Assinatura com tagline | logotipo + `Sua vidinha, em ordem.` em Inter 400 alinhada à esquerda do wordmark |
| Monocromático | símbolo em `grafite-900` sobre claro, ou `leite` sobre escuro; interseção diferenciada por contraste de opacidade |

**Área de proteção:** metade da altura do símbolo em todos os lados.
**Tamanho mínimo:** símbolo 16px; logotipo completo 96px de largura.
**Proibido:** girar, aplicar sombra, gradiente, contorno, esticar, trocar as cores, colocar sobre foto sem contraste, ou usar o símbolo com outro nome ao lado.

---

## 5. Ilustração e iconografia

### 5.1 Ícones

- **Base:** [Lucide](https://lucide.dev) — traço 1.75px, cantos arredondados, licença ISC, ótima cobertura e integração pronta em React Native.
- **Tamanhos:** 20px (inline) · 24px (padrão) · 32px (destaque). Área de toque sempre ≥ 44×44.
- **Cor:** `grafite-800` por padrão; `terracota-600` quando ativo; `areia-400` desabilitado.
- **Ícones de categoria** são o ponto de expressão: pictogramas próprios, com o mesmo traço, mas **domésticos e brasileiros** — sacola de mercado, botijão, tomada, roteador, mochila de escola, coleira, guarda-chuva. Nunca ícones abstratos de "categoria financeira".
- Proibido misturar famílias, e proibido ícone preenchido junto com ícone de traço na mesma tela.

### 5.2 Ilustração

- **Estilo:** formas cheias, sem contorno, cantos macios, paleta restrita da marca; textura discreta de grão (5–8% de opacidade) para tirar o ar de vetor plano de banco de imagens.
- **Sim, com pessoas — mas sem rosto detalhado.** Silhuetas com feições mínimas (um traço de sorriso ou nada). Motivo prático: rosto detalhado obriga a decidir tom de pele, idade e gênero em cada cena, e qualquer escolha exclui parte do público de uma marca que se define por acolher todo arranjo familiar. Silhuetas com **variedade de tons de pele (paleta de 5), tipos de cabelo e corpos** deixam a projeção com o usuário e evitam o vale da estranheza.
- **Cenas sempre domésticas e mundanas:** duas pessoas na cozinha, alguém guardando compras, o cachorro, a mesa com contas em cima, a janela. **Nunca:** cofrinho, porquinho, moeda voando, gráfico subindo, aperto de mão corporativo, foguete, escudo com cadeado.
- **Vetos:** 3D genérico estilo big tech, degradê roxo/neon, isométrico de dashboard, stock photo de casal sorrindo para o laptop.

### 5.3 Fotografia (se houver, em marketing)

Luz natural, hora dourada, interiores reais e vividos (com bagunça), casais e famílias brasileiras de composições variadas. Nunca escritório, nunca terno, nunca celular em primeiro plano com gráfico verde na tela.

---

## 6. Grid, espaçamento e forma (app mobile)

### 6.1 Espaçamento — base 4, ritmo 8

| Token | px | Uso |
|---|---|---|
| `space-1` | 4 | Rótulo colado ao ícone |
| `space-2` | 8 | Interno de chip |
| `space-3` | 12 | Entre linhas de um cartão |
| `space-4` | 16 | **Padding padrão de cartão** |
| `space-5` | 20 | **Margem lateral da tela** |
| `space-6` | 24 | Entre cartões |
| `space-8` | 32 | Entre seções |
| `space-12` | 48 | Respiro de topo de tela |

**Margem lateral fixa: 20px.** Grid de 4 colunas com calha de 16px para composições internas. Largura de conteúdo máxima em tablet: 560px, centralizado.

### 6.2 Raios de canto

O suave sem virar bolha. Um valor por componente, sem improviso.

| Componente | Raio |
|---|---|
| Cartão / bottom sheet | 20px (sheet: 24px só no topo) |
| Botão | 14px |
| Campo de formulário | 12px |
| Chip / tag / pílula | 999px |
| Avatar | círculo |
| Ícone do app | conforme plataforma (não desenhar máscara própria) |

### 6.3 Elevação

Sem Material Design cinza. Sombras **quentes e baixas**, de luz de sala:

```
nivel-1 (cartão):   0 1px 2px rgba(58,49,44,0.06), 0 2px 8px rgba(58,49,44,0.04)
nivel-2 (sheet):    0 8px 32px rgba(58,49,44,0.12)
```

No modo escuro, elevação é **cor** (`dark/superficie` → `dark/superficie-2`), não sombra.

### 6.4 Componentes-chave

- **Botão primário:** fundo `terracota-600`, texto `#FFFFFF` Inter 600 15px, altura 52px, raio 14, largura total nas telas de fluxo.
- **Botão secundário:** fundo transparente, borda 1.5px `areia-200`, texto `grafite-900`.
- **Botão destrutivo:** texto `erro` sobre fundo transparente. Nunca botão vermelho cheio.
- **Cartão de conta:** fundo `papel`, raio 20, padding 16, borda 1px `areia-200`, nível-1. Uma faixa colorida de 4px identifica a instituição.
- **Alvo de toque mínimo:** 44×44 (iOS) / 48×48 (Android).

### 6.5 Movimento

Rápido e suave, nunca saltitante. Duração 180–240ms, easing `cubic-bezier(0.2, 0, 0, 1)`. Sem bounce elástico, sem confete, sem animação de moeda caindo. Respeitar `prefers-reduced-motion` / *Reduzir movimento* do sistema.

---

## 7. Acessibilidade (obrigatório, não desejável)

1. Texto normal ≥ **4.5:1**; texto grande e ícones ≥ **3:1**. Nenhuma exceção para o botão primário — por isso ele usa `terracota-600` e não `500`.
2. **Cor nunca é o único portador de informação.** Entrada/saída precisa de sinal (`+`/`−`) ou rótulo, além da cor — 8% dos homens têm alguma deficiência de visão de cores, e terracota × manjericão é justamente um par de risco em deuteranopia.
3. Suportar fonte ampliada do sistema até 200%: nada de altura fixa em contêiner de texto.
4. Todo ícone com função tem `accessibilityLabel` em português.
5. Modo escuro e claro são testados igualmente — não é "modo secundário".

---

## 8. Resumo dos tokens (para implementar em código)

```ts
// theme/colors.ts — fonte de verdade da marca
export const colors = {
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
} as const;
```

Fontes carregadas via `expo-font` / `@expo-google-fonts/fraunces` e `@expo-google-fonts/inter`, com subset latin + latin-ext e apenas os pesos listados em §3.
