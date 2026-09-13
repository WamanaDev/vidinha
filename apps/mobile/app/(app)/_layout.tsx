import { useEffect, useState } from "react";
import { Redirect, Slot } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { supabaseClient } from "@lib/supabaseClient";
import { ActiveFamilyProvider } from "@lib/activeFamilyContext";
import { theme } from "@config/theme";
import type { Session } from "@supabase/supabase-js";

type SessionState = "checking" | "valid" | "invalid";

export default function AppLayout() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  useEffect(() => {
    let mounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionState(data.session ? "valid" : "invalid");
    });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        if (!mounted) return;
        setSessionState(session ? "valid" : "invalid");
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (sessionState === "checking") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (sessionState === "invalid") {
    return <Redirect href="/(auth)/login" />;
  }

  // Sessão válida: ActiveFamilyProvider decide, internamente, se deve
  // redirecionar para (onboarding) quando `myFamilies` estiver vazio
  // (ver src/lib/activeFamilyContext.tsx).
  return (
    <ActiveFamilyProvider>
      <Slot />
    </ActiveFamilyProvider>
  );
}
