# Estilo visual — ErrorState

**Interface (props):** `specs/mobile/design-system/error-state.md`.
**Tom:** humilde, sem drama. "A culpa é da gente, não sua" (`02-tone-of-voice.md` §4.1). **Nunca emoji.**

---

## 1. Composição e espaçamento

Estrutura idêntica ao `EmptyState` — a diferença é a cor do ícone e a presença do retry.

```
        [ ícone 32dp em círculo 88dp ]        círculo state.error.bg · ícone state.error.fg
                 ↓ 24dp
            "Não deu pra carregar agora"      h2 · Fraunces 600 20/26 · text.primary
                 ↓ 8dp
   "A culpa é da gente, não sua — tente        body · Inter 400 15/22 · text.secondary
    de novo em instantes."                     máx. 3 linhas · centralizado · máx. 280dp
                 ↓ 24dp
              [ Tentar de novo ]              Button secondary md
                 ↓ 8dp
              OF-5023                         caption · text.disabled · só em __DEV__
```

| Medida | Valor |
|---|---|
| Largura máxima do texto | 280dp, centralizado |
| `paddingHorizontal` / `paddingVertical` | 20 / 48dp |
| Círculo do ícone | 88dp |
| Ícone | 32dp Lucide, traço 1.75 |
| Em tela cheia | `flex: 1, justifyContent: 'center'` |
| Dentro de cartão/seção | `paddingVertical: 32`, círculo cai para 56dp e ícone para 24dp |

---

## 2. Cores

| Elemento | Light | Dark |
|---|---|---|
| Círculo do ícone | `#F7E6E4` (erro-50) | `rgba(242,184,181,0.16)` |
| Ícone | `#B3261E` (6.1:1 ✅) | `#F2B8B5` (9.7:1 ✅) |
| `title` | `#241E1A` | `#F2EBE3` |
| `description` | `#6E635C` | `#B0A498` |
| `errorCode` (só `__DEV__`) | `#BCB0A2` | `#6E635C` |
| Fundo do bloco | transparente | transparente |

**Este é o único componente do app onde o vermelho aparece como cor de estado em área ampla** — e mesmo aqui ele é só o ícone e um círculo tingido de 12%. Nunca um fundo vermelho, nunca uma barra vermelha no topo da tela, nunca um botão vermelho cheio.

Ícone padrão: `CloudOff` para falha de rede/servidor, `WifiOff` para offline, `RefreshCcwDot` para falha de sync do Open Finance, `ShieldAlert` para erro de autorização. Nunca `AlertTriangle` sozinho (é o ⚠️ que a marca proíbe) e nunca ícone piscando.

---

## 3. Variação por tipo de erro

| Tipo | Ícone | Cor do ícone | Ação primária |
|---|---|---|---|
| Falha de rede / servidor (`INTERNAL`) | `CloudOff` | `state.error.fg` | "Tentar de novo" (secondary) |
| Offline | `WifiOff` | `state.warning.fg` (`#8A5F10` / `#F2B441`) | "Tentar de novo" |
| Falha de sync Open Finance | `RefreshCcwDot` | `state.warning.fg` | "Atualizar agora" + texto "Seus dados anteriores continuam aqui" |
| Sem permissão (`FORBIDDEN`) | `Lock` | `text.secondary` | "Voltar" (secondary) |
| Sessão expirada (`UNAUTHENTICATED`) | `LogIn` | `text.secondary` | "Entrar de novo" (primary) |
| Não encontrado (`NOT_FOUND`) | `SearchX` | `text.secondary` | "Voltar" |

**Só o erro genuíno de sistema usa vermelho.** Offline e sync pendente usam âmbar — não são falhas, são situações temporárias. Sem permissão e sessão expirada usam neutro — não são erro nenhum, são o sistema funcionando.

---

## 4. Ação de retry

- `Button variant="secondary" size="md"`, não `fullWidth`, centralizado. **Secundário, não primário:** um botão terracota cheio dá peso demais a um erro que a marca quer desdramatizar. Exceção: "Entrar de novo" (sessão expirada) é `primary`, porque é a única ação possível na tela.
- Se `onRetry` não é fornecido, nenhum botão aparece — e a `description` precisa dizer o próximo passo em texto.
- Durante o retry, o botão entra em `loading` (spinner substitui o label, largura travada). O `ErrorState` **permanece na tela** até a query resolver — não pisca para skeleton e volta.

---

## 5. `errorCode` — regra de segurança

- Renderizado **apenas** sob `if (__DEV__)`, em `caption` / `text.disabled`, 8dp abaixo do botão.
- Em produção, o código do erro fica atrás de um `Button variant="ghost" size="sm"` com label "Detalhes", que abre um `BottomSheet` com o código copiável — para o usuário passar ao suporte (`02-tone-of-voice.md` §4.2). Nunca stack trace, nunca `debugMessage`, nunca caminho interno (`claude.md` §31, `02-API-AUTH.md` §4).
- A `description` já chega mapeada por `@lib/errorMapping.ts`. O componente **nunca** formata mensagem de erro por conta própria.

---

## 6. Erro inline vs. erro de tela

| Situação | Componente |
|---|---|
| Query da tela inteira falhou | `ErrorState` em tela cheia |
| Uma seção do dashboard falhou (as outras carregaram) | `ErrorState` compacto dentro do `Card` daquela seção (círculo 56dp) |
| Uma mutation falhou (salvar, convidar) | **Toast**, não `ErrorState` — a tela e os dados digitados permanecem |
| Validação de campo | Mensagem inline do `TextInput`, não `ErrorState` |
| Paginação falhou no meio da lista | Linha no `ListFooterComponent`: texto `body-sm` em `text.secondary` + `Button ghost sm` "Tentar de novo" |

**Toast de erro:** fundo `bg.surface`, borda 1dp `state.error.fg` a 40%, raio `radius.md` (14), `elevation.medium`, ícone 20dp `state.error.fg` à esquerda, texto `body-sm` em `text.body`, 4s de duração, entra por slide de baixo + fade (240ms `easing.out`), sai por fade (180ms `easing.in`).

---

## 7. Movimento

- Entrada: **fade 180ms**. Nunca shake, nunca vibração, nunca slide agressivo — a marca não alarma.
- Sem háptico. Vibrar em erro é alarme (`motion.md` §4.4).
- O ícone não pulsa nem gira.

---

## 8. Acessibilidade

- Container `accessible={true}`, `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"` (Android) — o leitor anuncia o erro sem interromper bruscamente.
- `accessibilityLabel` = `título + descrição`. O `errorCode` fica fora do label.
- Contraste auditado: `#B3261E`/`#F7E6E4` = 5.6:1 ✅; `#B3261E`/`#FAF7F2` = 6.1:1 ✅; `#F2B8B5`/`#191512` = 9.7:1 ✅.
- Ícone é decorativo (`accessibilityElementsHidden`) — a informação está toda no texto, conforme a regra "cor nunca é o único portador".
