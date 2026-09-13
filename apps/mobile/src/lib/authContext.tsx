import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "./supabaseClient";
import { secureStorage } from "./secureStorage";
import { registerSessionExpiredHandler } from "./graphqlClient";

// SUPOSIÇÃO: specs/mobile/00-overview.md §3.2 lista `AuthProvider` (sessão
// Supabase) em src/lib/, mas o código de referência de login.md e
// app-layout.md consulta `supabaseClient.auth` diretamente, sem passar por
// este contexto. Implementado aqui como um provider mínimo e conservador
// (sessão + logout), para as demais telas de settings/security poderem
// consumir `useAuth()` sem duplicar a lógica de sessão — sem contradizer o
// guard de `(app)/_layout.tsx`, que continua sendo a fonte de verdade da
// checagem de sessão para navegação.

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange(
      (_event, next) => {
        if (!mounted) return;
        setSession(next);
      },
    );

    registerSessionExpiredHandler(() => {
      setSession(null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // 00-DECISIONS.md §5: logout de todos os dispositivos via scope 'global'.
    await supabaseClient.auth.signOut({ scope: "global" });
    await secureStorage.clearAll();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
