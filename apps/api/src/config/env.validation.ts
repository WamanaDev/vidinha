import { z } from "zod";

/**
 * Schema Zod de validação das variáveis de ambiente (ver specs/backend/00-overview.md).
 * `@nestjs/config` espera um `validate()` (não `validationSchema` no formato Joi
 * quando usamos Zod) — exposto como `validate` em `configuration.ts`.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  DIRECT_URL: z.string().optional(),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL é obrigatório"),
  SUPABASE_JWKS_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PLUGGY_CLIENT_ID: z.string().optional(),
  PLUGGY_CLIENT_SECRET: z.string().optional(),
  PLUGGY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN_BACKEND: z.string().optional(),
  LOG_LEVEL: z.string().default("debug"),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  GRAPHQL_INTROSPECTION_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${parsed.error.message}`);
  }
  return parsed.data;
}
