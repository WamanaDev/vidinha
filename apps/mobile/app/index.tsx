import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { supabaseClient } from "@lib/supabaseClient";
import { theme } from "@config/theme";

// Splash / bootstrap: decide destino inicial (specs/mobile/00-overview.md §1
// e navigation.md — splash → auth → onboarding → tabs). A checagem de família
// ativa fica a cargo de (app)/_layout.tsx (ActiveFamilyProvider).
export default function Bootstrap() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(Boolean(data.session));
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (hasSession === null) {
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

  return <Redirect href={hasSession ? "/(app)/(tabs)" : "/(auth)/login"} />;
}
