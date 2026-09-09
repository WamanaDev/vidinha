# Estilo visual — Badge

**Interface (props):** `specs/mobile/design-system/badge.md`.

---

## 1. Geometria

| Medida | Valor |
|---|---|
| Altura | **24dp** (`minHeight`) |
| Raio | `radius.pill` = 999 |
| `paddingHorizontal` | 10dp |
| `paddingVertical` | 4dp |
| Tipografia | `label` (Inter 500 13/18) |
| Ícone opcional | 14dp, gap 4dp, à esquerda do texto |
| Borda | 1dp na cor `fg` a 30% de alfa — **sempre** |
| Gap entre badges | 8dp (`space.2`) |

- Texto em **minúsculas** (só a primeira letra maiúscula se for nome próprio). **Nunca CAIXA ALTA**, nunca `letterSpacing` positivo (`02-tone-of-voice.md` §2 e `03-visual-identity.md` §3.3).
- `numberOfLines={1}`, sem truncar: se o texto não cabe, o texto está errado — badge tem no máximo 2 palavras.
- Sem sombra, em nenhum tone, em nenhum tema.

A borda de 1dp é o que garante WCAG 1.4.11 (3:1 na delimitação do componente) sem depender do fundo tingido, que é fraco por design.

---

## 2. Cores por `tone` — Light

| `tone` | Fundo | Texto / ícone | Borda | Uso |
|---|---|---|---|---|
| `neutral` | `#F2EBE1` (areia-100) | `#3A312C` (grafite-800) | `rgba(58,49,44,0.3)` | Papel do membro, categoria, status sem conotação |
| `success` | `#EEF3EF` (manjericao-50) | `#1D4433` (manjericao-800) | `rgba(29,68,51,0.3)` | Banco conectado, convite aceito, compartilhado |
| `warning` | `#FDF3DC` (manteiga-100) | `#8A5F10` (manteiga-700) | `rgba(138,95,16,0.3)` | Sync pendente, conta a vencer, atualizando |
| `danger` | `#F7E6E4` (erro-50) | `#5C1512` (erro-900) | `rgba(179,38,30,0.3)` | **Só falha de sistema** (conexão revogada, erro de sync) |
| `info` | `#E8EEF2` (info-50) | `#3A6B8A` (info) | `rgba(58,107,138,0.3)` | Novidade, dica, informação de sistema |

Contrastes: 10.9:1 / 9.5:1 / 5.6:1 / 11.2:1 / 5.1:1 — todos ✅ AA.

> `warning` usa `manteiga-700` como texto, **não** `#B77A16` (que dá 3.1:1 sobre `#FDF3DC` e reprova). Ver `colors.md` §4.

---

## 3. Cores por `tone` — Dark

| `tone` | Fundo | Texto / ícone | Borda |
|---|---|---|---|
| `neutral` | `#2F2925` | `#F2EBE3` | `#3D352F` |
| `success` | `rgba(127,191,156,0.16)` | `#7FBF9C` | `rgba(127,191,156,0.4)` |
| `warning` | `rgba(242,180,65,0.16)` | `#F2B441` | `rgba(242,180,65,0.4)` |
| `danger` | `rgba(242,184,181,0.16)` | `#F2B8B5` | `rgba(242,184,181,0.4)` |
| `info` | `rgba(143,182,206,0.16)` | `#8FB6CE` | `rgba(143,182,206,0.4)` |

No dark, `fg` e `on-bg` colapsam no mesmo hex — o fundo é alfa sobre superfície escura, então a cor clara serve nos dois papéis.

---

## 4. Regras de uso (produto)

1. **`danger` nunca descreve dinheiro.** Não existe badge vermelho de "gasto alto", "acima do orçamento" ou "saldo negativo". Vermelho é erro de sistema (`03-visual-identity.md` §2.5). Saldo negativo usa `tone="warning"` com o texto "saldo negativo".
2. **Badge não substitui informação.** Um badge `warning` de "atualizando" vem sempre com o valor anterior visível ao lado — o usuário nunca fica sem número.
3. Máximo **um badge por linha de lista** e **dois por cartão**. Três badges numa tela é ruído.
4. Microcopy do vocabulário fixo (`02-tone-of-voice.md` §6): "quem organiza" (não "admin"), "banco conectado" (não "sincronizado"), "conta compartilhada", "só seu".
5. **Cor nunca é o único portador:** o texto do badge sempre diz o que a cor sugere. Um badge sem texto (só ponto colorido) não existe neste design system.

---

## 5. Badge de contagem (variante numérica)

Não está nas props, mas é usada na tab bar. Especificação para quando existir:

- Círculo de 18dp (ou pílula com `minWidth: 18` para 2+ dígitos), fundo `#B04530` (light) / `#E58A70` (dark), texto `#FFFFFF` / `#241E1A`, `label-sm` (Inter 500 11/14, tnum).
- Posição: canto superior direito do ícone da tab, offset `top: -4, right: -8`.
- Borda 2dp na cor do fundo da tab bar, para recortar do ícone.
- Máximo exibido: `9+`.
- **Sem animação de pulso.** Aparece por fade de 180ms.

---

## 6. Movimento

- Badge que aparece/some: fade 180ms `easing.standard`.
- Badge que muda de `tone` (ex.: "atualizando" → "banco conectado"): cross-fade de 180ms do texto **e** transição de 180ms das cores.
- Nenhum badge pisca, pulsa ou gira. Nem o de sync pendente.

---

## 7. Acessibilidade

- `accessibilityRole="text"`. O badge não é interativo — se precisar de toque, ele é um `Chip`, componente diferente.
- Quando dentro de um `ListItem` acessível, o badge é lido como parte do label agregado da linha ("Nubank, banco conectado, 4.280 reais").
- Todos os contrastes auditados na §2 e §3 (mínimo 5.1:1 light, 7.5:1 dark).
