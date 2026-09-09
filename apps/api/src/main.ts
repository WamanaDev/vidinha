import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

/**
 * Bootstrap Nest local (dev). Não é o entry point de produção — em produção o
 * app roda via `api/graphql.ts` (Vercel Serverless). Ver
 * specs/backend/common/vercel-serverless-handler.md.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
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
  app.use(helmet.default());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
