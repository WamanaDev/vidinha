import { useCallback, useMemo, useState } from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ListItem } from "@components/ListItem";
import { Amount } from "@components/Amount";
import { Skeleton } from "@components/Skeleton";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { fetchTransactions } from "@features/transactions/services/transactions.graphql";
import { useTransactionFilterStore } from "@stores/transactionFilterStore";
import type { TransactionEdge } from "@app-types/graphql-generated";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import { theme } from "@config/theme";

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const filter = useTransactionFilterStore((s) => s.filter);
  const [refreshing, setRefreshing] = useState(false);

  const queryKey = useMemo(
    () => ["transactions", familyId, filter] as const,
    [familyId, filter],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchTransactions({
        filter: { familyId, ...filter },
        first: PAGE_SIZE,
        after: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.transactions.pageInfo.hasNextPage
        ? (lastPage.transactions.pageInfo.endCursor ?? undefined)
        : undefined,
  });

  const edges: TransactionEdge[] = useMemo(
    () => data?.pages.flatMap((page) => page.transactions.edges) ?? [],
    [data],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePressItem = useCallback(
    (id: string) => {
      router.push(`/transaction/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: TransactionEdge }) => (
      <ListItem
        title={item.node.description}
        subtitle={new Date(item.node.date).toLocaleDateString("pt-BR")}
        rightElement={<Amount value={item.node.amount} colorByValue />}
        onPress={() => handlePressItem(item.node.id)}
      />
    ),
    [handlePressItem],
  );

  const keyExtractor = useCallback((item: TransactionEdge) => item.node.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={56} borderRadius={8} count={8} />
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

  if (edges.length === 0) {
    return (
      <EmptyState
        title="Nenhum lançamento por aqui"
        description="Conecte uma conta ou ajuste os filtros para ver seus lançamentos."
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={edges}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <Skeleton width="100%" height={56} borderRadius={8} />
          </View>
        ) : null
      }
      // claude.md §16.1 — evita renderizar todos os itens simultaneamente
      windowSize={7}
      maxToRenderPerBatch={PAGE_SIZE}
      initialNumToRender={PAGE_SIZE}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  footer: { padding: theme.spacing.md },
});
