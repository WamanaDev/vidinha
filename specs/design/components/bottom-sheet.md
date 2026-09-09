# Estilo visual — BottomSheet

**Interface (props):** `specs/mobile/design-system/bottom-sheet.md`.

---

## 1. Geometria

| Medida | Valor |
|---|---|
| Raio | `radius.xl` = **24dp**, **só no topo** (`borderTopLeftRadius` / `borderTopRightRadius`) |
| Handle (puxador) | 36×4dp, raio 2, centralizado, 8dp do topo |
| `paddingHorizontal` | 20dp (`space.5`) — igual à margem da tela |
| `paddingTop` | 8dp (abaixo do handle) |
| `paddingBottom` | `max(insets.bottom, 16)` + 16dp de respiro = tipicamente 32–50dp |
| Gap handle → título | 16dp (`space.4`) |
| Gap título → conteúdo | 16dp (`space.4`) |
| Altura máxima | **90% da altura da tela** — nunca 100%; a faixa de fundo visível é o que diz "isto é temporário" |
| `snapPoints` default | `['45%']` para seleção simples; `['45%','85%']` quando o conteúdo pode crescer |

Título: `h2` (Fraunces 600 20/26), `text.primary`, alinhado à **esquerda**, sem ponto final.
Botão de fechar (`X` 24dp, `icon.muted`) alinhado à direita na mesma linha do título, alvo 48×48. Presente sempre — o gesto de arrastar não é descobrível por todo mundo.

---

## 2. Cores e elevação

### Light

| Elemento | Valor |
|---|---|
| Fundo do sheet | `#FFFFFF` (`bg.surface`) |
| Handle | `#E5DCD0` (`border.default`) |
| Borda superior | nenhuma (a sombra e o raio já separam) |
| Sombra | `shadowColor #3A312C, opacity 0.12, radius 32, offset (0,-8)` · Android `elevation: 16` |
| Scrim | `rgba(36,30,26,0.45)` — grafite-900 a 45% |
| Divisor interno | 1dp `#F2EBE1` (`border.subtle`) |

### Dark

| Elemento | Valor |
|---|---|
| Fundo do sheet | `#2F2925` (`bg.surface-raised` — nível 2, mais claro que o cartão) |
| Handle | `#6E635C` |
| Borda superior | **1dp `#3D352F`** — obrigatória: no dark não há sombra e o sheet precisa se separar do fundo |
| Sombra | **nenhuma** (`shadowOpacity: 0`, `elevation: 0`) |
| Scrim | `rgba(10,8,7,0.60)` — mais denso que no light |
| Divisor interno | 1dp `#3D352F` |

O scrim mais denso no dark compensa o fato de que a diferença entre `#191512` (fundo) e `#2F2925` (sheet) é menor que entre `#FAF7F2` e `#FFFFFF` + sombra.

---

## 3. Conteúdo — padrões

### 3.1 Lista de opções (filtro, seleção)

- Cada opção é um `ListItem` de 56dp, texto `body`, com `Check` 20dp em `icon.active` à direita quando selecionada.
- Item selecionado: fundo `bg.surface-selected` (`#FBF0EC` light / `rgba(229,138,112,0.14)` dark), raio 12dp, sem borda.
- Divisor 1dp `border.subtle` entre opções, começando a 0dp da borda (dentro do sheet a margem já é o padding).
- Seleção múltipla usa `Check`, não checkbox quadrado.

### 3.2 Confirmação de ação

- Título `h2` + descrição `body` em `text.secondary` (máx. 3 linhas).
- Botões empilhados verticalmente, `fullWidth`, gap 8dp: ação principal em cima, alternativa embaixo.
- Ação destrutiva: `Button variant="destructive"` (ghost vermelho) em cima, `Button variant="secondary"` embaixo.
- **O botão secundário nunca se chama "Cancelar"** quando pode ser uma escolha positiva: "Deixar como está", "Continuar compartilhando" (`02-tone-of-voice.md` §4.9).

### 3.3 Rodapé de ação fixo

Quando o conteúdo rola dentro do sheet, o botão fica fixo no rodapé:
- Container com `bg.surface` (a mesma cor do sheet), `borderTopWidth: 1`, `borderTopColor: border.subtle`, `paddingTop: 12`, `paddingBottom: max(insets.bottom, 16)`.
- Sem sombra no rodapé — a linha basta.

---

## 4. Movimento

| Momento | Especificação |
|---|---|
| Abrir | Slide de baixo para cima, **240ms** (`duration.normal`) `easing.out`. Scrim entra em fade de 240ms simultaneamente |
| Fechar | Slide para baixo, 240ms `easing.in`. Scrim sai em fade de 180ms |
| Snap entre pontos | Spring criticamente amortecido: `damping: 22, stiffness: 260, mass: 0.9` — **sem overshoot** |
| Arrastar | Segue o dedo 1:1. Ao soltar, vai para o snap point mais próximo pela velocidade do gesto |
| Fechar por arrasto | A partir de 40% de deslocamento para baixo **ou** velocidade > 800dp/s |
| Háptico | `ImpactFeedbackStyle.Light` **só** no momento do snap entre pontos. Não ao abrir, não ao fechar |
| Toque no scrim | Fecha (a menos que o sheet seja bloqueante, ex.: confirmação de exclusão de conta) |
| Botão físico "voltar" (Android) | Fecha o sheet, não a tela |

Com `useReducedMotion`: o sheet aparece sem slide (fade de 0ms, posição final direto) e o scrim aparece instantaneamente. O gesto de arrasto continua funcionando — é gesto, não animação.

---

## 5. Teclado

- Quando o sheet contém `TextInput`, ele sobe junto com o teclado (`android_keyboardInputMode="adjustResize"`, `keyboardBehavior="interactive"` do `@gorhom/bottom-sheet`).
- O snap point ativo passa a ser `'85%'` automaticamente ao focar um campo.
- O botão de ação fixo fica acima do teclado.

---

## 6. Quando usar sheet vs. modal vs. tela

| Situação | Componente |
|---|---|
| Filtro, seleção de opção, escolha rápida | **BottomSheet** |
| Confirmação de ação (inclusive destrutiva) | **BottomSheet** |
| Fluxo com mais de um passo | Rota `(modals)` — tela cheia com slide vertical |
| Webview do Pluggy Connect | Rota `(modals)` fullscreen, sem sheet |
| Formulário com 3+ campos | Tela de stack, não sheet |

Regra: se o conteúdo precisa rolar mais que 85% da tela, não é um sheet.

---

## 7. Acessibilidade

- `accessibilityViewIsModal={true}` no container — o leitor de tela ignora o conteúdo atrás.
- Foco vai para o título ao abrir; ao fechar, volta para o elemento que abriu o sheet.
- Handle é decorativo (`accessibilityElementsHidden`); o botão `X` carrega `accessibilityLabel="Fechar"` e é o caminho acessível de saída.
- Scrim é `accessibilityRole="button"` com `accessibilityLabel="Fechar"` quando o toque fecha.
- Contraste: `#241E1A` sobre `#FFFFFF` = 16.1:1 ✅; `#F2EBE3` sobre `#2F2925` = 11.3:1 ✅.
