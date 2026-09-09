import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import serverlessExpress from "@vendia/serverless-express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Tipo resolvido contra o TS fonte (sempre disponível, não depende de build
// prévio); VALOR carregado do JS já compilado por `nest build` em runtime.
// Motivo: o builder da Vercel (@vercel/node) usa esbuild internamente para
// transpilar arquivos .ts sob /api, e o esbuild NÃO emite corretamente
// `emitDecoratorMetadata` — a injeção de dependência do NestJS quebra em
// runtime se o AppModule (com todos os decorators @Injectable/@Module) for
// importado como TS fonte aqui. Carregar o .js já compilado pelo `tsc` (via
// `nest build`, rodado no Build Command da Vercel antes desta função ser
// empacotada) evita o problema por completo — o esbuild só precisa
// empacotar JS puro, sem decorators para transformar. Um `import` estático
// para `../dist/...` não funciona no build local (dist ainda não existe
// nesse mesmo passo do tsc) — por isso o valor vem de `require()` (não
// verificado pelo typechecker) enquanto o tipo vem de `typeof import(...)`
// contra o arquivo fonte.
type AppModuleType = typeof import("../src/app.module").AppModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppModule = require("../dist/src/app.module").AppModule as AppModuleType;

/**
 * Entry point de produção (Vercel Serverless Function). Ver
 * specs/backend/common/vercel-serverless-handler.md §3.
 *
 * SUPOSIÇÃO: `@vendia/serverless-express` foi escolhido como adaptador
 * Express→Lambda/Vercel (nenhuma spec fixa essa lib) — troca local a este
 * arquivo se preferirem `@codegenie/serverless-express` ou o adaptador nativo
 * do `@vercel/node`.
 */
let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrapServer() {
  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ["error", "warn"],
    },
  );

  // CORS_ALLOWED_ORIGINS: lista separada por vírgula (ver
  // specs/infra/environments.md e specs/security/asvs-checklist.md — nunca
  // "*" em produção). Em desenvolvimento (sem a env var setada), libera
  // localhost do Metro/Expo para não travar o dev local.
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowlist =
    configuredOrigins.length > 0
      ? configuredOrigins
      : process.env.NODE_ENV !== "production"
        ? ["http://localhost:19006", "http://localhost:3000"]
        : [];

  nestApp.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowlist.includes(origin)) return callback(null, true);
      callback(new Error("Origin não permitida por política de CORS"));
    },
    credentials: false,
    methods: ["POST", "OPTIONS"],
  });

  const helmet = await import("helmet");
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
