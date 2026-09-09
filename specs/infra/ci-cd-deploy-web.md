# CI/CD — `deploy-web.yml` (Deploy do backend via Vercel)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Ajustado ao monorepo — ver `00-DECISIONS.md` §11 e [git-workflow.md](./git-workflow.md).

**Root Directory no projeto Vercel:** o projeto Vercel deste backend está configurado com **Root Directory = `apps/api`**. A Vercel já resolve o monorepo pnpm a partir dali (instala as dependências do workspace inteiro via `pnpm install` na raiz do repo, mas builda/serve apenas `apps/api`). Isso não muda nenhuma decisão de infraestrutura já tomada (continua Vercel Serverless Functions) — é só a configuração de "onde a Vercel entra" dentro do monorepo.

Preview automático já é nativo da integração GitHub↔Vercel (não exige workflow próprio quando o projeto Vercel está conectado ao repositório, com Root Directory apontando para `apps/api`). Ainda assim, um workflow explícito é mantido para rodar `prisma migrate deploy` **antes** do deploy da função, algo que a integração automática da Vercel não faz sozinha.

O trigger do workflow usa `paths:` para só rodar quando `apps/api/**` ou `packages/**` (contrato compartilhado / config comum) mudarem — uma mudança isolada em `apps/mobile` não deve acionar migração nem deploy do backend.

```yaml
name: Deploy Web

on:
  pull_request:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/**"
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/**"

jobs:
  migrate-and-deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - working-directory: apps/api
        run: pnpm prisma migrate deploy
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
      - name: Deploy to Vercel
        working-directory: apps/api
        run: npx vercel deploy --token=${{ secrets.VERCEL_TOKEN }} ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

O job usa `environment: production` no merge em `main`, o que permite configurar um **required reviewer** no GitHub (Settings → Environments) como gate manual antes de migrar/deployar em produção — sem custo adicional.

Notas de monorepo:
- `vercel deploy` roda com `working-directory: apps/api` para que a CLI da Vercel resolva o mesmo Root Directory configurado no projeto (`apps/api`), mesmo quando disparado via GitHub Actions em vez do deploy automático nativo.
- `pnpm install --frozen-lockfile` continua rodando a partir da raiz do monorepo (não tem `working-directory`), pois o lockfile do pnpm workspace é único para todo o repositório.
