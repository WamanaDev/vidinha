# Common — main.ts, api/graphql.ts, PrismaService serverless e cold start

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §4.2` (PrismaService/connection pooling) e `§5` (Adaptação Vercel Serverless). Ver [`../00-overview.md`](../00-overview.md) para o índice completo.

**Nota de monorepo (`00-DECISIONS.md §11`):** todos os caminhos abaixo (`src/...`, `api/graphql.ts`, `vercel.json`) são relativos a `apps/api/`, não à raiz do repositório `vidinha/`. No dashboard da Vercel, o projeto deve ser configurado com **Root Directory = `apps/api`** — feito isso, os caminhos usados dentro deste documento e em `vercel.json` (`api/graphql.ts`) continuam corretos exatamente como escritos, pois passam a ser relativos à raiz do projeto Vercel (`apps/api/`), não do monorepo. Fora do contexto do dashboard da Vercel (ex.: referenciando o arquivo a partir da raiz do monorepo), o caminho completo é `apps/api/api/graphql.ts`.

---

## 1. `JwtAuthGuard`/`GraphQLExceptionFilter` no `app.module.ts`

Ambos são registrados **globalmente** via `APP_GUARD`/`APP_FILTER` (padrão NestJS para providers globais), não via `app.useGlobalGuards()`/`app.useGlobalFilters()` no `main.ts` — isso é necessário porque `JwtAuthGuard` precisa do `Reflector` para checar `@Public()`; o filtro precisa do logger/Sentry, enquanto `app.useGlobalGuards()` fora do container de DI não resolveria essas dependências de forma limpa. O `app.module.ts` completo (com a ordem exata de providers e todos os módulos de domínio importados) está documentado em [`../modules/family/family.module.md`](../modules/family/family.module.md), por ser o primeiro módulo de domínio implementado.

## 2. `PrismaService` e connection pooling em ambiente serverless

**Decisão adotada e justificativa:** usar **Prisma Client padrão com singleton por processo/módulo Nest** (não Prisma Accelerate/Data Proxy), combinado com **Supabase Postgres via connection string em modo *pooled* (PgBouncer, porta `6543`, `?pgbouncer=true&connection_limit=1`)** para as invocações serverless da Vercel, e a connection string *direta* (porta `5432`) reservada para `prisma migrate deploy` no CI/CD.

Motivos, dado o ambiente já decidido em `00-DECISIONS.md` (Vercel Serverless + Supabase Free, custo zero):

1. **Prisma Accelerate/Data Proxy é solução paga além de um limite gratuito baixo** — contradiz a decisão explícita de "custo zero" da `00-DECISIONS.md §7`. O Supabase Free já inclui um pooler PgBouncer gerenciado (porta `6543`), que resolve o mesmo problema (excesso de conexões diretas por causa de múltiplas invocações concorrentes) sem custo adicional.
2. Cada invocação de função serverless da Vercel pode instanciar um novo processo Node; sem pooling, cada uma abriria sua própria conexão direta ao Postgres, esgotando rapidamente o limite de conexões do plano Free do Supabase. Rotear todas as invocações pelo PgBouncer do Supabase (modo *transaction*) resolve isso no nível de infraestrutura, sem exigir um produto pago do Prisma.
3. Dentro de cada invocação/processo, o `PrismaService` é um **singleton reaproveitado entre requisições que reutilizam o mesmo container "morno"** (contêiner Lambda não reciclado entre invocações — o cenário comum de "warm start" na Vercel), evitando reabrir o `PrismaClient` a cada requisição.

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // DATABASE_URL aponta para a connection string "pooled" (PgBouncer, porta 6543)
      // em staging/production; ambiente local pode usar a porta direta.
      datasources: { db: { url: process.env.DATABASE_URL } },
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

O padrão de "cache do app Nest entre invocações" (seção 3 abaixo) é o que garante que este `PrismaService` singleton realmente sobreviva entre requisições de um mesmo container morno, evitando reconexões desnecessárias — sem isso, mesmo o pooling do PgBouncer não evitaria a sobrecarga de recriar o `NestFactory` e todo o grafo de DI a cada chamada.

## 3. Adaptação para Vercel Serverless — `api/graphql.ts`

```typescript
// api/graphql.ts
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';

// Cache do handler entre invocações do mesmo container "morno" (mitiga cold start,
// conforme 00-DECISIONS.md §7 sobre a limitação conhecida de cold start na Vercel).
let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrapServer() {
  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn'], // nestjs-pino assume o logging estruturado real (LoggerModule)
  });

  nestApp.enableCors({
    origin: (origin, callback) => {
      const allowlist = [
        'https://admin.vidinha.app',
        'https://staging-admin.vidinha.app',
        ...(process.env.NODE_ENV !== 'production'
          ? ['http://localhost:19006', 'http://localhost:3000']
          : []),
      ];
      if (!origin || allowlist.includes(origin)) return callback(null, true);
      callback(new Error('Origin não permitida por política de CORS'));
    },
    credentials: false,
    methods: ['POST', 'OPTIONS'],
  });

  // helmet: ver F1 de 04-SECURITY-COMPLIANCE.md
  const helmet = await import('helmet');
  nestApp.use(helmet.default());

  await nestApp.init();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServer();
  }
  return cachedHandler(req, res);
}
```

```jsonc
// vercel.json
{
  "version": 2,
  "builds": [{ "src": "api/graphql.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/graphql", "dest": "api/graphql.ts" }],
  "functions": {
    "api/graphql.ts": { "maxDuration": 10 } // limite do plano Hobby, conforme 00-DECISIONS.md §7
  }
}
```

- **Cold start:** mitigado por (1) cache de `cachedHandler` em variável de módulo — sobrevive entre invocações de um mesmo container morno; (2) JWKS cacheado em memória por 10 min pelo `jwks-rsa` (ver [`jwt-auth-guard.md`](./jwt-auth-guard.md)), evitando round-trip ao Supabase a cada cold start; (3) `PrismaService` singleton (seção 2 acima) reaproveitado pelo mesmo cache.
- **`apps/api/src/main.ts` continua existindo** para desenvolvimento local (`nest start --watch`), usando `NestFactory.create(AppModule)` padrão com `app.listen(3000)` — não é o entry point de produção, que é sempre `api/graphql.ts`.
- Subscriptions GraphQL **não são configuradas** (WebSocket), conforme limitação já assumida em `00-DECISIONS.md §7`.

## Suposições

- **`@vendia/serverless-express`** foi escolhido como adaptador Express→Lambda/Vercel por ser a opção mais usada com NestJS em ambientes serverless da AWS/Vercel; nenhuma das specs anteriores fixa essa biblioteca — se o time preferir `@codegenie/serverless-express` (fork mais atualizado) ou o adaptador nativo de `@vercel/node`, a troca é local a `api/graphql.ts`, sem impacto em nenhuma outra camada.
- **Prisma Client padrão + PgBouncer do Supabase (não Accelerate/Data Proxy)** foi a escolha justificada na seção 2 pela restrição de custo zero de `00-DECISIONS.md §7`; caso o produto saia do plano Free do Supabase no futuro, reavaliar Prisma Accelerate para pooling gerenciado multi-região.
- **Rota HTTP única `/graphql`** e ausência de rotas REST auxiliares (exceto o próprio webhook do Pluggy, fora do escopo deste documento) — consistente com o restante das specs, que não define nenhum endpoint REST além do webhook citado em `00-DECISIONS.md §2`; a implementação do endpoint de webhook do Pluggy (`POST /webhooks/pluggy`) fica para quando o módulo `open-finance` for implementado (ver [`../modules/open-finance/open-finance.module.md`](../modules/open-finance/open-finance.module.md)), e deve reaproveitar o mesmo `helmet`/CORS restritivo já configurado acima, mas como uma function serverless separada (`api/webhooks/pluggy.ts`), já que o webhook não passa por autenticação JWT de usuário (usa segredo compartilhado do Pluggy) e não deve compartilhar o `JwtAuthGuard` global.
