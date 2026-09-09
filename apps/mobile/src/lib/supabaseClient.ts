import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { env } from "@config/env";
import { secureStorage, SECURE_STORE_KEYS } from "./secureStorage";

/**
 * Instância única do supabase-js (00-DECISIONS.md §5: identidade via Supabase
 * Auth; refresh token gerenciado pelo SDK, persistido via Expo SecureStore).
 *
 * TODO: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ainda estão
 * vazios em apps/mobile/.env — preencher quando o projeto Supabase existir.
 */

// Adapter mínimo exigido pelo supabase-js (getItem/setItem/removeItem),
// delegando para o secureStorage tipado (specs/mobile/lib/secure-storage.md).
const supabaseSecureStoreAdapter = {
  getItem: () => secureStorage.getItem(SECURE_STORE_KEYS.SUPABASE_SESSION),
  setItem: (_key: string, value: string) =>
    secureStorage.setItem(SECURE_STORE_KEYS.SUPABASE_SESSION, value),
  removeItem: () =>
    secureStorage.removeItem(SECURE_STORE_KEYS.SUPABASE_SESSION),
};

export const supabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: supabaseSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce", // claude.md §32 — PKCE obrigatório para app nativo
      lock: processLock,
    },
  },
);
