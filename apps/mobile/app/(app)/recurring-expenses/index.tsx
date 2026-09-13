import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useRecurringExpenses } from "@features/recurring-expenses/hooks/useRecurringExpenses";
import { RecurringExpenseListItem } from "@features/recurring-expenses/components/RecurringExpenseListItem";
import type { RecurringExpense } from "@features/recurring-expenses/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/recurring-expenses.md — rota `/(app)/recurring-expenses`.
export default function RecurringExpensesScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } =
    useRecurringExpenses(familyId);

  const handleCreate = useCallback(() => {
    router.push("/recurring-expenses/new");
  }, [router]);

  const handlePressItem = useCallback(
    (id: string) => {
      router.push(`/recurring-expenses/${id}/edit`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: RecurringExpense }) => (
      <RecurringExpenseListItem
        recurringExpense={item}
        onPress={() => handlePressItem(item.id)}
      />
    ),
    [handlePressItem],
  );

  const keyExtractor = useCallback((item: RecurringExpense) => item.id, []);

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

  if (isError || !data) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  const recurringExpenses = data.recurringExpenses;

  if (recurringExpenses.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
        <EmptyState
          title="Nenhuma despesa recorrente ainda"
          description="Cadastre aluguel, assinaturas e outras contas fixas para acompanhar juntos."
          actionLabel="Nova despesa recorrente"
          onAction={handleCreate}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <FlatList
        style={{ flex: 1 }}
        data={recurringExpenses}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: space[4], paddingBottom: 0 }}>
            <Button
              label="Nova despesa recorrente"
              variant="ghost"
              size="sm"
              onPress={handleCreate}
            />
          </View>
        }
        windowSize={7}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
