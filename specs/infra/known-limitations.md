# Limitações Conhecidas do Arranjo "Custo Zero"

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).

| Limitação | Impacto | Gatilho para migrar | Direção de migração |
|---|---|---|---|
| **Cold start em Vercel Serverless** | Primeira requisição após período ocioso pode levar 1–3s a mais | Reclamação de latência perceptível pelos usuários ou P95 > SLA definido | Habilitar Vercel Fluid Compute / functions "always warm" (pago) ou migrar API para Render/Fly.io com instância sempre ativa |
| **Sem suporte a GraphQL Subscriptions** | Nenhuma atualização em tempo real (ex.: saldo mudando ao vivo entre membros da família); MVP usa polling/pull-to-refresh | Produto exigir colaboração em tempo real (ex.: ver o parceiro editando uma despesa ao vivo) | Migrar API para host com WebSocket persistente (Render/Fly.io) ou adotar Supabase Realtime diretamente do client para os casos que exigirem live-update |
| **Limite de duração de função (10s, Vercel Hobby)** | Operações longas (ex.: importação inicial de histórico grande do Pluggy) podem estourar timeout | Timeout recorrente em sincronização inicial de Open Finance | Mover import inicial para um job assíncrono (fila) ou upgrade para Vercel Pro (60s) |
| **Builds EAS Free limitados por mês** | Poucos builds/mês no plano gratuito; times maiores esgotam a cota rapidamente | Cota mensal de builds esgotada de forma recorrente | Upgrade para EAS Production/Priority plan (pago), ou reduzir frequência de build usando EAS Update (OTA) para a maioria das mudanças JS |
| **Sem backup automático gerenciado no Supabase Free** | Recuperação depende do dump semanal manual via Actions; RPO de até 7 dias | Volume de dados/transações tornar perda de até 1 semana inaceitável para o negócio | Upgrade do projeto Supabase para plano Pro (backups diários point-in-time) |
| **2 projetos Supabase Free por organização** | Sem projeto extra dedicado a "development" isolado; dev local compartilha instância de staging | Times crescerem e schemas pessoais colidirem ou dificultarem testes paralelos | Upgrade de 1 projeto para plano pago dedicado a development, ou adotar Postgres local via Docker como padrão único |
| **Rate limiting em memória (`@nestjs/throttler`)** | Não funciona corretamente com múltiplas instâncias/regiões simultâneas da função serverless | Escala horizontal real da API (mais de 1 instância ativa simultaneamente) tornar o rate limit inconsistente | Migrar store do throttler para Upstash Redis Free, já planejado em `00-DECISIONS.md` §7 |
| **Sem WAF dedicado** | Depende das proteções padrão da borda Vercel | Ataques automatizados/abuso relevante detectados nos logs/Sentry | Colocar Cloudflare (Free) na frente do domínio customizado quando houver domínio próprio |
| **Ambiente sandbox do Pluggy limitado** | Dados de teste sintéticos, sem cobertura de todos os bancos reais | Aproximação de lançamento em produção | Contratar acesso de produção do Pluggy (fora do tier gratuito) |

Nenhuma dessas limitações bloqueia o MVP; todas são aceitas conscientemente em troca de custo operacional zero, com gatilho de migração explícito para reavaliação.
