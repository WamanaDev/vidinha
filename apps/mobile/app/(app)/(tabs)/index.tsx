import { useCallback, useMemo } from "react";
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
import { Card } from "@components/Card";
import { ListItem } from "@components/ListItem";
import { Amount } from "@components/Amount";
import { Button } from "@components/Button";
import { useAuth } from "@lib/authContext";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useMyFamilies } from "@features/family/hooks/useFamily";
import { useDashboardSummary } from "@features/dashboard/hooks/useDashboardSummary";
import { TabShortcutCard } from "@features/dashboard/components/TabShortcutCard";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { TransactionEdge } from "@app-types/graphql-generated";

// specs/mobile/routes/tabs/home.md — rota `/(app)/(tabs)/`.
// Compõe `myFamilies` (nome/família ativa) com `useDashboardSummary`
// (accounts + cards + últimas transações — todas queries reais desde a Fase
// 0 de sync do Open Finance). `recurringExpenses(familyId)`, citada na spec,
// não existe no SDL real — fora do escopo desta v1.
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { familyId } = useActiveFamily();
  const { data: familiesData } = useMyFamilies();
  const {
    accounts,
    cards,
    recentTransactions,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardSummary();
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
  const handlePressTransaction = useCallback(
    (id: string) => router.push(`/transaction/${id}`),
    [router],
  );

  // Soma o saldo das contas visíveis. Cartão não entra na soma de saldo:
  // `currentInvoice` representa uma fatura em aberto (dívida), não dinheiro
  // disponível — misturar os dois num único total daria uma leitura
  // financeira errada. Mostramos as duas somas separadas.
  const totalAccountsBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );
  const totalCardsInvoice = useMemo(
    () => cards.reduce((sum, card) => sum + (card.currentInvoice ?? 0), 0),
    [cards],
  );

  const hasFinancialData = accounts.length > 0 || cards.length > 0;

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
    const apiError = error as GraphQLApiError | undefined;
    return (
      <ErrorState
        description={mapErrorCodeToMessage(apiError?.code)}
        errorCode={apiError?.code}
        onRetry={refetch}
      />
    );
  }

  const activeFamily = familiesData?.myFamilies.find(
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

      {hasFinancialData ? (
        <>
          <View style={{ gap: space[3] }}>
            {accounts.length > 0 ? (
              <Card padding="md">
                <Text
                  style={[typeScale.labelSm, { color: tokens.text.secondary }]}
                >
                  Saldo em contas
                </Text>
                <Amount value={totalAccountsBalance} variant="large" />
              </Card>
            ) : null}
            {cards.length > 0 ? (
              <Card padding="md">
                <Text
                  style={[typeScale.labelSm, { color: tokens.text.secondary }]}
                >
                  Faturas em aberto
                </Text>
                <Amount value={totalCardsInvoice} variant="large" />
              </Card>
            ) : null}
          </View>

          <View style={{ gap: space[3] }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[typeScale.h3, { color: tokens.text.primary }]}>
                Últimos lançamentos
              </Text>
              <Button
                label="Ver todas"
                variant="ghost"
                size="sm"
                onPress={goToTransactions}
              />
            </View>
            {recentTransactions.length > 0 ? (
              <Card padding="none">
                {recentTransactions.map((edge: TransactionEdge, index) => (
                  <View key={edge.node.id}>
                    <ListItem
                      title={edge.node.description}
                      subtitle={new Date(edge.node.date).toLocaleDateString(
                        "pt-BR",
                      )}
                      rightElement={
                        <Amount value={edge.node.amount} colorByValue />
                      }
                      onPress={() => handlePressTransaction(edge.node.id)}
                    />
                    {index < recentTransactions.length - 1 ? (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: tokens.border.default,
                          marginLeft: space[4],
                        }}
                      />
                    ) : null}
                  </View>
                ))}
              </Card>
            ) : (
              <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
                Vocês ainda não têm lançamentos por aqui.
              </Text>
            )}
          </View>
        </>
      ) : null}

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
