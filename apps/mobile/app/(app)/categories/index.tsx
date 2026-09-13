import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCategories } from "@features/categories/hooks/useCategories";
import { useUpdateCategory } from "@features/categories/hooks/useCategoryActions";
import { CategoryListItem } from "@features/categories/components/CategoryListItem";
import type { Category } from "@features/categories/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/categories.md — rota `/(app)/categories`.
export default function CategoriesScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useCategories(familyId);
  const updateCategory = useUpdateCategory(familyId);

  const handlePressCategory = useCallback(
    (id: string) => {
      router.push(`/categories/${id}/edit`);
    },
    [router],
  );

  const handleToggleHidden = useCallback(
    (id: string, hiddenFromFamily: boolean) => {
      updateCategory.mutate({ id, hiddenFromFamily });
    },
    [updateCategory],
  );

  const handleCreateCategory = useCallback(() => {
    router.push("/categories/new");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryListItem
        category={item}
        onPress={() => handlePressCategory(item.id)}
        onToggleHidden={(hidden) => handleToggleHidden(item.id, hidden)}
        togglingHidden={
          updateCategory.isPending && updateCategory.variables?.id === item.id
        }
      />
    ),
    [handlePressCategory, handleToggleHidden, updateCategory],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="100%" height={64} borderRadius={12} count={6} />
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

  const categories = data.categories;

  if (categories.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
        <EmptyState
          title="Nenhuma categoria por aqui"
          description="Crie categorias para organizar melhor os gastos de vocês."
          actionLabel="Nova categoria"
          onAction={handleCreateCategory}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <FlatList
        style={{ flex: 1 }}
        data={categories}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: space[4], paddingBottom: 0 }}>
            <Button
              label="Nova categoria"
              variant="ghost"
              size="sm"
              onPress={handleCreateCategory}
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
