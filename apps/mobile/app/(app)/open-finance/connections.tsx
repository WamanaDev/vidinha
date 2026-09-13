import { useCallback } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useOpenFinanceConnections } from "@features/open-finance/hooks/useOpenFinanceConnections";
import {
  useRevokeOpenFinanceConnection,
  useSyncOpenFinanceConnection,
} from "@features/open-finance/hooks/useOpenFinanceActions";
import { OpenFinanceConnectionCard } from "@features/open-finance/components/OpenFinanceConnectionCard";
import type { OpenFinanceConnection } from "@features/open-finance/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/connect-open-finance.md — rota `/(app)/open-finance/connections`.
export default function OpenFinanceConnectionsScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { data, isLoading, isError, error, refetch } =
    useOpenFinanceConnections(familyId);

  const syncConnection = useSyncOpenFinanceConnection(familyId);
  const revokeConnection = useRevokeOpenFinanceConnection(familyId);

  const handleConnect = useCallback(() => {
    router.push("/open-finance/connect");
  }, [router]);

  const handleSync = useCallback(
    (connectionId: string) => {
      syncConnection.mutate(connectionId);
    },
    [syncConnection],
  );

  // Desconectar remove o acesso concedido à instituição — ação destrutiva,
  // exige confirmação (claude.md — nunca destrutivo sem confirmação explícita).
  const handleRevoke = useCallback(
    (connectionId: string, institutionName: string) => {
      Alert.alert(
        "Desconectar instituição",
        `Vocês vão parar de ver as informações de ${institutionName} no Vidinha. Essa ação pode ser refeita conectando de novo depois.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Desconectar",
            style: "destructive",
            onPress: () => revokeConnection.mutate(connectionId),
          },
        ],
      );
    },
    [revokeConnection],
  );

  const renderItem = useCallback(
    ({ item }: { item: OpenFinanceConnection }) => (
      <OpenFinanceConnectionCard
        connection={item}
        onSync={() => handleSync(item.id)}
        onRevoke={() => handleRevoke(item.id, item.institutionName)}
        syncing={
          syncConnection.isPending && syncConnection.variables === item.id
        }
        revoking={
          revokeConnection.isPending && revokeConnection.variables === item.id
        }
      />
    ),
    [handleSync, handleRevoke, syncConnection, revokeConnection],
  );

  const keyExtractor = useCallback(
    (item: OpenFinanceConnection) => item.id,
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
        <Skeleton width="100%" height={120} borderRadius={16} count={3} />
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

  const connections = data?.openFinanceConnections ?? [];

  if (connections.length === 0) {
    return (
      <EmptyState
        title="Nenhuma instituição conectada"
        description="Conecte uma conta ou cartão via Open Finance para ver tudo em um só lugar."
        actionLabel="Conectar instituição"
        onAction={handleConnect}
      />
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      contentContainerStyle={{ padding: space[4], gap: space[3] }}
      data={connections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
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
