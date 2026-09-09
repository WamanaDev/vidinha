# Vidinha — Checklist de Verificação do Nome

**Versão:** 1.0
**Status:** ⚠️ **Nenhuma verificação foi executada.** Este documento é a lista de tarefas a executar antes de travar o nome.
**Regra:** não encomendar arte-final de logotipo, não registrar domínio pago, não criar contas sociais em massa e **não publicar na loja** antes de fechar os blocos 1 a 5.

---

## 0. Risco conhecido, antes de começar

"Vidinha" é uma palavra comum do português — diminutivo de "vida". Isso tem duas consequências que definem toda a estratégia deste checklist:

- **Ruim:** é altamente provável que `vidinha.com.br` e `@vidinha` já estejam ocupados (por perfis pessoais, blogs, lojinhas, contas dormentes). Palavra comum e curta = alta demanda.
- **Bom:** por ser palavra comum e de uso corrente, é **difícil que alguém detenha marca exclusiva sobre ela de forma ampla**. Marcas registráveis a partir de termos comuns costumam ser fracas, e o registro tende a ser concedido apenas dentro de uma classe específica. O risco real não é "alguém é dono da palavra"; é "alguém já registrou na classe de software/serviço financeiro" — que é exatamente o que o bloco 3 investiga.

**Decisão a tomar antes de tudo:** o nome legal da empresa **não precisa** ser o nome da marca. É perfeitamente viável operar como `Vidinha` com uma razão social qualquer. Não deixe a disponibilidade de CNPJ influenciar a escolha da marca.

---

## 1. Domínios

Ordem de prioridade e o que fazer com cada resultado.

| # | Domínio | Prioridade | Onde verificar | Se estiver ocupado |
|---|---|---|---|---|
| 1.1 | `vidinha.com.br` | 🔴 Crítica | registro.br (Whois) | Verificar status: se "aguardando liberação" ou expirando, monitorar. Se ativo com site real, partir para 1.3/1.4 |
| 1.2 | `vidinha.app` | 🟠 Alta | qualquer registrar (Namecheap, Cloudflare) | `.app` tem HSTS obrigatório — bom sinal de seriedade. Ótima alternativa se o `.com.br` cair |
| 1.3 | `vidinha.com` | 🟡 Média | Whois | Provavelmente ocupado/parkeado. Verificar preço de aftermarket (Sedo, Afternic) — só vale se < R$ 15k |
| 1.4 | `usevidinha.com.br` / `usevidinha.com` | 🟠 Alta (plano B natural) | registro.br / Whois | Padrão consagrado de startup (`use...`). Recomendado registrar **mesmo que o principal esteja livre**, como defesa |
| 1.5 | `vidinha.com.vc` / `vidinha.me` | 🟢 Baixa | registrar | Para links curtos e convites |
| 1.6 | `vidinha.io` / `vidinha.co` | 🟢 Baixa | registrar | Só defensivo, não usar como principal (público brasileiro não digita `.io`) |

**Tarefas adicionais do bloco:**
- [ ] Rodar Whois nos 6 acima e anotar data de expiração de cada um que estiver ocupado
- [ ] Se `vidinha.com.br` estiver ocupado mas sem site publicado, verificar se há e-mail de contato do titular e avaliar proposta de compra
- [ ] Registrar imediatamente o que estiver livre entre 1.1, 1.2 e 1.4 (custo baixo, risco de perder alto)
- [ ] Registrar também os erros de digitação óbvios: `vidnha`, `vidinhaapp`, `avidinha`
- [ ] Configurar privacidade de Whois e renovação automática por 3+ anos

---

## 2. Redes sociais — handle `@vidinha`

Objetivo: **um handle único e idêntico em todas as redes**. Se `@vidinha` não estiver disponível em pelo menos Instagram + TikTok, a recomendação é adotar um handle alternativo **uniforme** (ex.: `@usevidinha`) em todas as redes, inclusive naquelas onde o original está livre.

| # | Rede | Peso para o produto | O que verificar |
|---|---|---|---|
| 2.1 | **Instagram** | 🔴 Crítico — canal principal do público (casais/famílias 25–45) | `@vidinha` livre? Se ocupado: perfil ativo ou dormente? Público ou privado? Nº de posts e última publicação |
| 2.2 | **TikTok** | 🔴 Crítico — aquisição orgânica do segmento | `@vidinha` livre? Verificar também se o nome coincide com criador conhecido |
| 2.3 | **YouTube** | 🟠 Alto — conteúdo explicativo de Open Finance | `@vidinha` (handle) e disponibilidade do nome do canal |
| 2.4 | **X / Twitter** | 🟡 Médio — suporte e status de incidentes | `@vidinha` livre? Handle curto costuma estar tomado e dormente |
| 2.5 | **WhatsApp Business** | 🟠 Alto — canal de suporte no Brasil | Nome do perfil comercial + link `wa.me` |
| 2.6 | **LinkedIn** | 🟡 Médio — recrutamento e parcerias | `linkedin.com/company/vidinha` |
| 2.7 | **Threads** | 🟢 Baixo | Herda o handle do Instagram — decidido junto com 2.1 |
| 2.8 | **Pinterest / Facebook** | 🟢 Baixo | Só defensivo (o público de "organização da casa" existe no Pinterest) |
| 2.9 | **GitHub / npm** | 🟢 Baixo | Organização `vidinha` para os repositórios |

**Tarefas do bloco:**
- [ ] Verificar os 9 canais no mesmo dia (disponibilidade muda)
- [ ] Registrar tudo o que estiver livre **imediatamente**, mesmo sem plano de uso
- [ ] Se um handle crítico estiver ocupado por conta dormente (sem post há > 2 anos), avaliar solicitação de handle inativo junto à plataforma — processo lento e incerto, **não bloquear o lançamento por causa dele**
- [ ] Anotar o handle final escolhido em `01-brand-strategy.md` para uso consistente em todo material

---

## 3. Marca registrada — INPI

Este é o bloco de **risco jurídico real**. Os demais são inconvenientes; este pode obrigar a trocar o nome depois do lançamento.

- [ ] **3.1** Busca no sistema **Busca Web do INPI** (`busca.inpi.gov.br`) por: `VIDINHA`, `VIDINHA` (radical/aproximada), `VIDIN`, `VIDA` + termos combinados
- [ ] **3.2** Buscar nas classes de Nice pertinentes ao produto:
  - **Classe 9** — software/aplicativo baixável (essencial)
  - **Classe 36** — serviços financeiros, informação financeira (essencial; é aqui que estarão os concorrentes fintech)
  - **Classe 42** — SaaS, desenvolvimento de software (essencial)
  - **Classe 35** — publicidade, marketing de afiliados (relevante para o modelo de monetização futuro, `claude.md` §8)
  - **Classe 38** — telecomunicações/troca de dados (defensiva, opcional)
- [ ] **3.3** Verificar também marcas **similares foneticamente** (o INPI indefere por colidência sonora, não só por grafia idêntica): `VIDINHA`, `VIDINE`, `VIDDINHA`, `VIVIDINHA`, `MINHA VIDINHA`
- [ ] **3.4** Verificar se existe pedido em andamento (status "em exame") — pedido anterior tem prioridade sobre o seu
- [ ] **3.5** **Contratar um agente de propriedade industrial** para o parecer de registrabilidade e para o depósito. Não fazer o depósito sozinho: erro de classe ou de especificação é caro e irreversível na prática
- [ ] **3.6** Depositar como **marca mista** (nome + logotipo), que costuma ter proteção mais fácil de obter para termos de uso comum, e avaliar também o depósito nominativo
- [ ] **3.7** Verificar disponibilidade do nome empresarial na **JUCESP/junta comercial** do estado e a viabilidade do CNPJ (lembrando §0: razão social pode divergir da marca)
- [ ] **3.8** Registrar a decisão e a data da busca neste arquivo — buscas envelhecem

**Critério de decisão:** se existir marca ativa `VIDINHA` (ou colidente) nas classes **9, 36 ou 42**, tratar como **bloqueador** e ir para o bloco 6. Colidência apenas em classes distantes (ex.: 25 — vestuário; 43 — restaurantes) normalmente **não** impede o uso, mas exige parecer do agente antes de seguir.

---

## 4. Lojas de aplicativos

Nome duplicado na loja não é ilegal, mas é fatal para descoberta orgânica — e a Apple pode rejeitar por confusão com app existente.

- [ ] **4.1 Google Play** — buscar "vidinha" e "vida" + finanças. Existe app com nome igual? Ativo? Qual categoria?
- [ ] **4.2 App Store (BR)** — mesma busca. Verificar também na App Store de Portugal (mesma língua, mesmo risco de colisão)
- [ ] **4.3** Verificar a disponibilidade do **nome exato do app** ao reservar o Bundle ID / App ID nas duas contas de desenvolvedor (a Apple permite reservar o nome com antecedência — fazer isso cedo)
- [ ] **4.4** Verificar o **subtítulo (30 chars)** e o campo de palavras-chave: `Sua vidinha, em ordem.` cabe (22 caracteres ✓)
- [ ] **4.5** Buscar por apps financeiros brasileiros de nome próximo — "Vida", "Minha Vida", "Vidinha Financeira", "Nossa Vida" — para avaliar confusão de marca no mesmo nicho
- [ ] **4.6** Verificar se "vidinha" retorna resultados indesejados na busca das lojas (conteúdo adulto, jogos, apps de baixa reputação que sujem a associação)

---

## 5. Higiene linguística e de reputação

Barato de verificar, caro de descobrir depois.

- [ ] **5.1** Buscar `"vidinha"` no Google e no TikTok: a palavra tem uso pejorativo corrente? (Atenção à expressão "vidinha medíocre"/"vidinha besta", que existe em português — avaliar se a conotação irônica atrapalha ou se pode ser reapropriada com afeto pela marca. Recomendação inicial: **a reapropriação afetiva é viável e até simpática**, mas precisa ser confirmada em teste com usuários)
- [ ] **5.2** Verificar significados indesejados em espanhol e inglês (mercados de expansão futura). "Vidinha" não tem significado óbvio em nenhum dos dois — confirmar
- [ ] **5.3** Teste de soletração por telefone: a pessoa consegue escrever depois de ouvir? (risco: `vidinha` × `vidiña` × `vidinia`)
- [ ] **5.4** Buscar por marcas/pessoas públicas negativas associadas ao termo
- [ ] **5.5** Teste com 8–10 pessoas do público-alvo: "o que você imagina que um app chamado Vidinha faz?" — se ninguém chegar perto de "casa/vida cotidiana/organização", o nome exige mais trabalho de tagline (e a tagline recomendada em `01-brand-strategy.md` já foi escolhida pensando nisso)

---

## 6. Variações de fallback

A usar apenas se um bloqueador aparecer (marca registrada colidente nas classes 9/36/42, ou colisão direta nas lojas). Em ordem de preferência.

| # | Variação | Prós | Contras | Quando usar |
|---|---|---|---|---|
| 1 | **Vidinha App** | Preserva 100% da marca falada; padrão aceito nas lojas; libera domínio `vidinhaapp.com.br` e handle `@vidinhaapp` | Não resolve conflito de marca registrada (o termo distintivo continua sendo "Vidinha") | Bloqueio **apenas** de domínio/handle |
| 2 | **Nossa Vidinha** | Reforça o núcleo do produto (o plural, o compartilhado); mais distintivo no INPI que o termo isolado; "nossa" é a palavra mais Vidinha que existe | Duas palavras, mais longo na loja; "Nossa!" tem leitura ambígua de interjeição | ✅ **Primeira escolha em caso de bloqueio de marca** — é a única variação que melhora a marca em vez de só contornar o problema |
| 3 | **Vidinha a Dois** | Muito claro sobre o público | ❌ Contradiz `specs/00-DECISIONS.md` §1 (família de 2 a N pessoas) e fecha o produto em casal | Só se o produto for reposicionado como exclusivo de casais |
| 4 | **Vidinha em Casa** | Ancora firme no território doméstico; provavelmente livre em tudo | Longo; "em casa" ficou associado a conteúdo de pandemia | Fallback confortável de domínio e loja |
| 5 | **Vidinha Família** | Descritivo e claro | Termo genérico enfraquece o registro no INPI; "família" tem carga política no Brasil e pode alienar arranjos não convencionais — conflita com `01-brand-strategy.md` §10.8 | **Último recurso** |
| 6 | **Vidinha Junto / Junto** | "Junto" é curtíssimo e é literalmente a proposta de valor | "Junto" isolado é palavra comum demais para registrar; abandonar "Vidinha" joga fora o melhor ativo da marca | Só num rebrand completo |

**Regra de decisão:**
- Bloqueio **só** de domínio/handle → variação **1** (`Vidinha App` / `usevidinha`), mantendo a marca falada como "Vidinha".
- Bloqueio de **marca registrada** → variação **2** (`Nossa Vidinha`), com novo depósito no INPI como marca mista.
- **Não** trocar o nome por bloqueio de `.com` internacional. O produto é brasileiro, o `.com.br` e o `.app` bastam.

---

## 7. Ordem de execução e critério de liberação

```
1. INPI (bloco 3)  ─── é o único que pode matar o nome
        ↓ sem colidência em 9/36/42
2. Lojas (bloco 4) ─── colisão direta é quase-bloqueador
        ↓
3. Domínios (bloco 1) + Sociais (bloco 2) ─── registrar tudo o que estiver livre no MESMO dia
        ↓
4. Higiene linguística (bloco 5) ─── ajusta tagline, não bloqueia
        ↓
5. TRAVAR O NOME → liberar arte-final de logotipo, conta de desenvolvedor e conteúdo
```

**O nome só é considerado travado quando:** blocos 3 e 4 vierem sem bloqueador, o depósito no INPI tiver sido protocolado (não é preciso esperar a concessão, que leva 1–2 anos) e domínio principal + handles críticos estiverem registrados.

### Registro do resultado

| Bloco | Data da verificação | Responsável | Resultado | Bloqueador? |
|---|---|---|---|---|
| 1. Domínios | | | | |
| 2. Sociais | | | | |
| 3. INPI | | | | |
| 4. Lojas | | | | |
| 5. Linguística | | | | |

**Decisão final do nome:** ____________________  **Data:** ____ / ____ / ______
