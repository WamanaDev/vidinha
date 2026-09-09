# Tokens de movimento — Vidinha

**Fonte da verdade:** `branding/03-visual-identity.md` §6.5.
**Princípio:** rápido e suave, nunca saltitante. O movimento na Vidinha confirma que algo aconteceu — ele nunca celebra, nunca entretém, nunca chama atenção para si.

---

## 1. Durações

| Token | ms | Uso |
|---|---|---|
| `duration.instant` | 100 | Pressed state (fundo/opacidade de botão, `ListItem`) |
| `duration.fast` | 180 | **Padrão.** Fade de conteúdo, expandir/recolher, badge que aparece |
| `duration.normal` | 240 | Transição de tela, bottom sheet, modal, layout que reflui |
| `duration.slow` | 320 | Só para elementos grandes que cruzam a tela inteira (webview do Open Finance entrando) |
| `duration.shimmer` | 1200 | Ciclo completo do `Skeleton` (loop) |

**Nada passa de 320ms.** Se uma animação parece precisar de mais, ela não deveria ser uma animação.

---

## 2. Easing

| Token | Curva | Uso |
|---|---|---|
| `easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | **Padrão de tudo.** Entrada e saída de conteúdo, transição de tela |
| `easing.out` | `cubic-bezier(0, 0, 0, 1)` | Elemento que entra na tela (sheet subindo, toast aparecendo) — desacelera no fim |
| `easing.in` | `cubic-bezier(0.4, 0, 1, 1)` | Elemento que sai da tela — acelera e some |
| `easing.linear` | `linear` | Só shimmer do `Skeleton` e rotação de spinner |

```ts
// src/config/theme/motion.ts
import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: { instant:100, fast:180, normal:240, slow:320, shimmer:1200 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    out:      Easing.bezier(0, 0, 0, 1),
    in:       Easing.bezier(0.4, 0, 1, 1),
    linear:   Easing.linear,
  },
} as const;
```

**Proibido, por decisão de marca:** `Easing.bounce`, `Easing.elastic`, spring com `damping` baixo (overshoot visível), confete, animação de moeda caindo, contador de número "subindo" até o valor, pulsar de badge, qualquer coisa que celebre gasto ou economia.

Springs são permitidos **apenas** para o gesto de arrasto do bottom sheet, com `damping: 22, stiffness: 260, mass: 0.9` — configuração criticamente amortecida, sem overshoot.

---

## 3. Fade vs. slide — quando usar cada um

| Situação | Transição | Motivo |
|---|---|---|
| Troca de aba na tab bar | **Nenhuma** (troca imediata) | Abas são lugares paralelos; movimento sugere hierarquia que não existe |
| Push de stack (lista → detalhe) | **Slide horizontal** nativo da plataforma | Hierarquia real: entra pela direita, volta pela esquerda |
| Modal / rota `(modals)` | **Slide vertical** (de baixo para cima), 240ms `easing.out` | Convenção de plataforma para "camada temporária" |
| Bottom sheet | **Slide vertical** + scrim em fade, 240ms `easing.out` | — |
| Skeleton → conteúdo carregado | **Cross-fade** 180ms `easing.standard` | Slide aqui faria a tela "pular"; o conteúdo já estava no lugar |
| Empty state → lista com dados | **Fade** 180ms | — |
| Erro inline aparecendo sob um input | **Fade + expansão de altura** 180ms | Nunca shake, nunca vibração — a marca não repreende |
| Toast / snackbar | Entra: **slide de baixo + fade** 240ms `easing.out`. Sai: **fade** 180ms `easing.in` | — |
| Valor monetário que mudou (após sync) | **Cross-fade** 180ms do número antigo para o novo | Nunca rolagem de dígitos nem contador crescente |
| Item removido de lista | **Fade + colapso de altura** 240ms | — |
| Item adicionado a lista | **Fade** 180ms, sem slide | Slide de item novo faz a lista inteira parecer instável |
| Pull-to-refresh | Indicador nativo da plataforma, cor `brand.primary` | Não customizar com Lottie |

**Regra que unifica:** *slide comunica lugar; fade comunica estado.* Se o usuário mudou de lugar, desliza. Se o mesmo lugar mudou de estado, esmaece.

---

## 4. Feedback de toque (pressed state)

Este é o movimento mais frequente do app — precisa ser barato e consistente.

| Componente | Feedback | Duração |
|---|---|---|
| Botão `primary` / `secondary` / `destructive` | Troca de cor de fundo para o token `*-pressed` | 100ms `easing.standard` |
| Botão `ghost` / link | Fundo `action.ghost.bg-pressed` aparece | 100ms |
| `ListItem` | Fundo `bg.surface-sunken` (light) / `bg.surface-raised` (dark) | 100ms |
| `Card` com `onPress` | Escala `0.985` **+** fundo `bg.surface-sunken` | 100ms |
| Ícone-botão (header, chevron) | Opacidade `0.6` | 100ms |
| Tab bar | Sem animação de fundo; só a troca de cor do ícone/label, 180ms | 180ms |

**Regras:**
1. Escala só em `Card`, e no máximo `0.985`. Botão **não** encolhe — botão troca de cor. Encolher um botão de 52dp de altura o tira do alvo de toque durante o gesto.
2. `android_ripple` do `Pressable` fica **desligado** (`android_ripple={null}`): o ripple do Material é cinza-frio e destoa da paleta quente. Usamos o mesmo feedback de cor nas duas plataformas.
3. O estado pressed aparece em `onPressIn` e some em `onPressOut`, sempre — nunca só no `onPress`.
4. Feedback háptico (`expo-haptics`): `ImpactFeedbackStyle.Light` em **três** ações apenas — confirmar um compartilhamento, concluir uma conexão de banco, e o `snap` do bottom sheet. Nunca em navegação comum, nunca em erro (vibrar em erro é alarme, e a Vidinha não alarma).

---

## 5. Loading

| Situação | Padrão |
|---|---|
| Carregamento inicial de tela | `Skeleton` com shimmer (nunca spinner de tela cheia) |
| Botão em `loading` | Spinner de 18dp substituindo o label, **largura do botão travada** no valor anterior para a tela não reflui |
| Refetch em background (dados já na tela) | Nenhum indicador — os dados novos entram por cross-fade |
| Pull-to-refresh | `RefreshControl` nativo, `tintColor`/`colors` = `brand.primary` |
| Paginação (`fetchNextPage`) | Spinner de 24dp centralizado no `ListFooterComponent`, com 24dp de padding vertical |
| Sync do Open Finance em andamento | `Badge tone="warning"` estático com texto "atualizando" — **sem** animação de rotação persistente |

O shimmer do `Skeleton` é a **única** animação em loop permitida no app, e ela para assim que o conteúdo chega.

---

## 6. Movimento reduzido (obrigatório)

`AccessibilityInfo.isReduceMotionEnabled()` é lido no boot e observado via listener. Quando ativo:

1. Todas as `duration` viram **0**, exceto `duration.instant` (100ms), que permanece — o feedback de toque não é "movimento", é resposta, e removê-lo faz o app parecer travado.
2. Slides viram cortes secos; fades viram troca imediata.
3. O shimmer do `Skeleton` para: o placeholder fica **estático** em `bg.surface-sunken`.
4. O escalonar de `Card` é desligado; sobra só a troca de cor.
5. Transição de stack e de modal passa a `animation: 'none'` no Expo Router.

```ts
const reduceMotion = useReducedMotion(); // react-native-reanimated
const d = reduceMotion ? 0 : motion.duration.normal;
```

---

## 7. Checklist de revisão de movimento (cole no PR)

- [ ] Alguma animação passa de 320ms?
- [ ] Tem bounce, elástico ou overshoot visível?
- [ ] Um número em R$ está sendo animado dígito a dígito?
- [ ] A animação celebra ou repreende algo (confete, shake, pulso vermelho)?
- [ ] Existe animação em loop além do shimmer do `Skeleton`?
- [ ] `useReducedMotion` foi respeitado?
- [ ] O botão muda de tamanho ao ser pressionado? → só cor
