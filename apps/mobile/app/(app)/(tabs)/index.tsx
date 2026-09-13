import { useCallback } from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import {
  Landmark,
  CreditCard,
  Receipt,
  Users,
  Settings,
} from "lucide-react-native";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useAuth } from "@lib/authContext";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useDashboardSummary } from "@features/dashboard/hooks/useDashboardSummary";
import { TabShortcutCard } from "@features/dashboard/components/TabShortcutCard";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/tabs/home.md — rota `/(app)/(tabs)/`.
// SUPOSIÇÃO: ver `src/features/dashboard/hooks/useDashboardSummary.ts` — a
// spec pede um dashboard consolidado (accounts+cards+transactions+recurring),
// mas nenhuma dessas queries de listagem existe pronta no SDL real além de
// `myFamilies`. A instrução da tarefa autoriza explicitamente uma v1 simples:
// nome/famílias do usuário + atalhos para as outras abas.
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useDashboardSummary();
  const tokens = useTokens();

  const goToAccounts = useCallback(
    () => router.push("/(app)/(tabs)/accounts"),
    [router],
  );
  const goToCards = useCallback(
    () => router.push("/(app)/(tabs)/cards"),
    [router],
  );
  const goToTransactions = useCallback(
    () => router.push("/(app)/(tabs)/transactions"),
    [router],
  );
  const goToFamily = useCallback(
    () => router.push("/(app)/(tabs)/family"),
    [router],
  );
  const goToSettings = useCallback(
    () => router.push("/(app)/settings"),
    [router],
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="70%" height={32} borderRadius={6} />
        <View style={{ height: space[6] }} />
        <Skeleton width="100%" height={96} borderRadius={12} count={2} />
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  const activeFamily = data?.myFamilies.find(
    (membership) => membership.family.id === familyId,
  )?.family;
  // SUPOSIÇÃO: `useAuth()` (@lib/authContext.tsx) só expõe a `Session` bruta do
  // Supabase, sem um `User` do domínio Vidinha já mapeado (esse mapeamento
  // não existe em nenhum hook hoje) — usamos `user_metadata.display_name`
  // (convenção comum do Supabase Auth) com fallback para o e-mail da sessão.
  const displayName =
    (session?.user?.user_metadata?.display_name as string | undefined) ||
    session?.user?.email ||
    "";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      contentContainerStyle={{ padding: space[4], gap: space[6] }}
    >
      <View style={{ gap: space[1] }}>
        <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
          {displayName ? `Oi, ${displayName}!` : "Oi!"}
        </Text>
        {activeFamily ? (
          <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
            Vocês estão na família {activeFamily.name}.
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: space[3],
        }}
      >
        <View style={styles.shortcut}>
          <TabShortcutCard
            icon={<Landmark color={tokens.icon.active} size={24} />}
            label="Contas"
            onPress={goToAccounts}
          />
        </View>
        <View style={styles.shortcut}>
          <TabShortcutCard
            icon={<CreditCard color={tokens.icon.active} size={24} />}
            label="Cartões"
            onPress={goToCards}
          />
        </View>
        <View style={styles.shortcut}>
          <TabShortcutCard
            icon={<Receipt color={tokens.icon.active} size={24} />}
            label="Lançamentos"
            onPress={goToTransactions}
          />
        </View>
        <View style={styles.shortcut}>
          <TabShortcutCard
            icon={<Users color={tokens.icon.active} size={24} />}
            label="Família"
            onPress={goToFamily}
          />
        </View>
        <View style={styles.shortcut}>
          <TabShortcutCard
            icon={<Settings color={tokens.icon.active} size={24} />}
            label="Configurações"
            onPress={goToSettings}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  shortcut: { width: "47%" },
});
