import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { Skeleton } from "@components/Skeleton";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { ListItem } from "@components/ListItem";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useAccounts } from "@features/accounts/hooks/useAccounts";
import { useOpenFinanceConnections } from "@features/open-finance/hooks/useOpenFinanceConnections";
import { AccountListItem } from "@features/accounts/components/AccountListItem";
import type { AccountWithInstitution } from "@features/accounts/types";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

const CONNECTION_STATUS_LABEL: Record<string, string> = {
  UPDATING: "Sincronizando…",
  LOGIN_ERROR: "Credenciais inválidas — reconecte",
  OUTDATED: "Desatualizada — toque para sincronizar",
  ERROR: "Erro na sincronização",
  REVOKED: "Desconectada",
};

// specs/mobile/routes/tabs/accounts.md — rota `/(app)/(tabs)/accounts`.
// SUPOSIÇÃO: ver `src/features/accounts/services/accounts.graphql.ts` — não
// há query própria `accounts(familyId)` no SDL real; os dados vêm de
// `openFinanceConnections(familyId)` achatados em `useAccounts`.
export default function AccountsScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const { accounts, isLoading, isError, error, refetch } =
    useAccounts(familyId);
  const { data: connectionsData } = useOpenFinanceConnections(familyId);
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

  const handleAddManually = useCallback(() => {
    router.push("/(app)/accounts/new" as never);
  }, [router]);

  const handleManageConnections = useCallback(() => {
    router.push("/open-finance/connections");
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
    const pendingConnections = connectionsData?.openFinanceConnections ?? [];

    // Existe uma conexão (Open Finance já autorizado), só ainda não trouxe
    // nenhuma conta — mostrar "nenhuma conta conectada" aqui seria enganoso
    // (parece que nada foi feito, quando na verdade a sincronização está em
    // andamento ou falhou). Mostra o estado real de cada conexão pendente.
    if (pendingConnections.length > 0) {
      return (
        <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
          <Text
            style={[
              typeScale.body,
              {
                color: tokens.text.secondary,
                padding: space[4],
                paddingBottom: 0,
              },
            ]}
          >
            Suas contas ainda não sincronizaram.
          </Text>
          {pendingConnections.map((connection) => (
            <ListItem
              key={connection.id}
              title={connection.institutionName}
              subtitle={
                CONNECTION_STATUS_LABEL[connection.status] ?? connection.status
              }
              onPress={handleManageConnections}
            />
          ))}
          <View style={{ padding: space[4] }}>
            <Button
              label="Ver conexões Open Finance"
              variant="secondary"
              onPress={handleManageConnections}
              fullWidth
            />
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          title="Nenhuma conta conectada"
          description="Conecte uma instituição financeira ou cadastre uma conta manualmente para ver suas contas aqui."
          actionLabel="Conectar instituição"
          onAction={handleConnect}
        />
        <View style={{ padding: space[4], paddingTop: 0 }}>
          <Button
            label="Adicionar conta manualmente"
            variant="secondary"
            onPress={handleAddManually}
            fullWidth
          />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      data={accounts}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={
        <View
          style={{
            padding: space[4],
            paddingBottom: 0,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Button
            label="Gerenciar conexões Open Finance"
            variant="ghost"
            size="sm"
            onPress={handleManageConnections}
          />
          <Button
            label="Adicionar conta manual"
            variant="ghost"
            size="sm"
            onPress={handleAddManually}
          />
        </View>
      }
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
