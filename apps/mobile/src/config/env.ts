import Constants from "expo-constants";

/**
 * Leitura tipada das variáveis públicas do app (EXPO_PUBLIC_* via app.config.ts `extra`).
 * Nunca colocar segredo aqui — tudo que passa por `extra` vai embutido no bundle JS.
 *
 * TODO: preencher apps/mobile/.env com credenciais reais quando existirem
 * (Supabase URL/anon key, Sentry DSN, API URL de produção/staging).
 */

interface Env {
  GRAPHQL_ENDPOINT: string;
  SENTRY_DSN_MOBILE: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;

export const env: Env = {
  GRAPHQL_ENDPOINT: extra.apiUrl ?? "",
  SENTRY_DSN_MOBILE: extra.sentryDsnMobile ?? "",
  SUPABASE_URL: extra.supabaseUrl ?? "",
  SUPABASE_ANON_KEY: extra.supabaseAnonKey ?? "",
};
