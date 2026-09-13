import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { EmptyState } from "@components/EmptyState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCards } from "@features/cards/hooks/useCards";
import { CardListItem } from "@features/cards/components/CardListItem";
import type { Card } from "@features/cards/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/tabs/cards.md — rota `/(app)/(tabs)/cards`.
// A query real `cards(familyId: ID!): [Card!]!` já existe no SDL
// (packages/graphql-schema/schema.graphql) — ver `src/features/cards/services/cards.graphql.ts`.
export default function CardsScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useCards(familyId);
  const tokens = useTokens();

  const handlePressCard = useCallback(
    (id: string) => {
      router.push(`/card/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Card }) => (
      <CardListItem card={item} onPress={() => handlePressCard(item.id)} />
    ),
    [handlePressCard],
  );

  const keyExtractor = useCallback((item: Card) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: tokens.bg.app, padding: space[4] }}
      >
        <Skeleton width="100%" height={64} borderRadius={12} count={3} />
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

  const cards = data?.cards ?? [];

  if (cards.length === 0) {
    return (
      <EmptyState
        title="Nenhum cartão por aqui"
        description="Assim que um cartão for conectado ou cadastrado, ele aparece aqui."
      />
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      data={cards}
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
