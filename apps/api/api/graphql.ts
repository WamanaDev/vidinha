import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import serverlessExpress from "@vendia/serverless-express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AppModule } from "../src/app.module";

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

  nestApp.enableCors({
    origin: (origin, callback) => {
      const allowlist = [
        "https://admin.vidinha.app",
        "https://staging-admin.vidinha.app",
        ...(process.env.NODE_ENV !== "production"
          ? ["http://localhost:19006", "http://localhost:3000"]
          : []),
      ];
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
