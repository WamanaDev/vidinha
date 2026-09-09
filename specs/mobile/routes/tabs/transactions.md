# Lançamentos / Transações

**Rota:** `/(app)/(tabs)/transactions` (`apps/mobile/app/(app)/(tabs)/transactions.tsx`)

**Query/Mutation GraphQL:** `transactions(filter, orderBy, first, after)` — paginado via `useInfiniteQuery` (cursor-based, mapeia 1:1 com `TransactionConnection.pageInfo`).

**Estados:** loading (skeleton), empty (sem transações no filtro), error, loading-more (footer).

Performance mobile (`claude.md` §16.1/§16.3): usa `FlatList` (nunca `ScrollView` + `.map()`), com `windowSize`/`maxToRenderPerBatch`/`removeClippedSubviews`. `renderItem` é envolvido em `useCallback` com dependência apenas em `handlePressItem` — sem isso, a cada re-render (ex.: nova página via `fetchNextPage`) o `FlatList` receberia uma nova referência de função e invalidaria a otimização de `React.memo` interna do `ListItem`, forçando re-render de toda a lista visível. `ListItem` (ver [`../../design-system/list-item.md`](../../design-system/list-item.md)) é exportado como `React.memo(ListItem)` para essa otimização fazer efeito.

## Código completo — `apps/mobile/app/(app)/(tabs)/transactions.tsx`

```tsx
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ListItem } from '@components/ListItem';
import { Amount } from '@components/Amount';
import { Skeleton } from '@components/Skeleton';
import { EmptyState } from '@components/EmptyState';
import { ErrorState } from '@components/ErrorState';
import { useActiveFamily } from '@lib/activeFamilyContext';
import { fetchTransactions } from '@features/transactions/services/transactions.graphql';
import { useTransactionFilterStore } from '@stores/transactionFilterStore';
import type { TransactionEdge } from '@types/graphql-generated';
import { theme } from '@config/theme';

const PAGE_SIZE = 20;

export default function TransactionsScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const filter = useTransactionFilterStore((s) => s.filter);
  const [refreshing, setRefreshing] = useState(false);

  const queryKey = useMemo(
    () => ['transactions', familyId, filter] as const,
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
        ? lastPage.transactions.pageInfo.endCursor
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
        subtitle={new Date(item.node.date).toLocaleDateString('pt-BR')}
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
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={56} borderRadius={8} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description={(error as any)?.message}
        errorCode={(error as any)?.code}
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
```

## Serviço GraphQL — `apps/mobile/src/features/transactions/services/transactions.graphql.ts`

Documento consumido acima, nomes exatos de `02-API-AUTH.md` §3.5:

```typescript
import { graphqlRequest } from '@lib/graphqlClient';
import type {
  TransactionConnection,
  TransactionFilterInput,
  TransactionOrderInput,
} from '@types/graphql-generated';

const TRANSACTIONS_QUERY = /* GraphQL */ `
  query Transactions(
    $filter: TransactionFilterInput!
    $orderBy: TransactionOrderInput
    $first: Int
    $after: Cursor
  ) {
    transactions(filter: $filter, orderBy: $orderBy, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          description
          amount
          date
          hiddenFromFamily
          category { id name icon }
          account { id name }
          card { id name }
        }
      }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      totalCount
    }
  }
`;

interface TransactionsQueryVariables {
  filter: TransactionFilterInput;
  orderBy?: TransactionOrderInput;
  first?: number;
  after?: string;
}

interface TransactionsQueryResult {
  transactions: TransactionConnection;
}

export function fetchTransactions(variables: TransactionsQueryVariables) {
  return graphqlRequest<TransactionsQueryResult, TransactionsQueryVariables>(
    TRANSACTIONS_QUERY,
    variables,
  );
}
```
