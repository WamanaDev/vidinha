import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Skeleton } from "@components/Skeleton";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useAccounts } from "@features/accounts/hooks/useAccounts";
import { AccountListItem } from "@features/accounts/components/AccountListItem";
import type { AccountWithInstitution } from "@features/accounts/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/tabs/accounts.md — rota `/(app)/(tabs)/accounts`.
// SUPOSIÇÃO: ver `src/features/accounts/services/accounts.graphql.ts` — não
// há query própria `accounts(familyId)` no SDL real; os dados vêm de
// `openFinanceConnections(familyId)` achatados em `useAccounts`.
export default function AccountsScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const { accounts, isLoading, isError, error, refetch } =
    useAccounts(familyId);
  const tokens = useTokens();

  const handlePressAccount = useCallback(
    (id: string) => {
      router.push(`/account/${id}`);
    },
    [router],
  );

  const handleConnect = useCallback(() => {
    router.push("/open-finance/connect");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: AccountWithInstitution }) => (
      <AccountListItem
        account={item}
        onPress={() => handlePressAccount(item.id)}
      />
    ),
    [handlePressAccount],
  );

  const keyExtractor = useCallback(
    (item: AccountWithInstitution) => item.id,
    [],
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="100%" height={64} borderRadius={12} count={5} />
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

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="Nenhuma conta conectada"
        description="Conecte uma instituição financeira para ver suas contas aqui."
        actionLabel="Conectar instituição"
        onAction={handleConnect}
      />
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      data={accounts}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      // claude.md §16.1 — evita renderizar tudo simultaneamente.
      windowSize={7}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
