import { useCallback } from "react";
import { FlatList, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { Button } from "@components/Button";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useFamily } from "@features/family/hooks/useFamily";
import { MemberListItem } from "@features/family/components/MemberListItem";
import type { FamilyMembership } from "@features/family/types";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/tabs/family.md — rota `/(app)/(tabs)/family`.
// Query real: `family(id: ID!)` (packages/graphql-schema/schema.graphql).
// Estado empty é impossível aqui (família ativa é obrigatória para chegar
// nesta tela — ver `ActiveFamilyProvider`), conforme a própria spec descreve.
export default function FamilyScreen() {
  const router = useRouter();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useFamily(familyId);
  const tokens = useTokens();

  const handlePressMember = useCallback(
    (membershipId: string) => {
      router.push(`/family-management/member/${membershipId}`);
    },
    [router],
  );

  const handleManage = useCallback(() => {
    router.push("/family-management/members");
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: FamilyMembership }) => (
      <MemberListItem
        membership={item}
        onPress={() => handlePressMember(item.id)}
      />
    ),
    [handlePressMember],
  );

  const keyExtractor = useCallback((item: FamilyMembership) => item.id, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="60%" height={28} borderRadius={6} />
        <View style={{ height: space[4] }} />
        <Skeleton width="100%" height={64} borderRadius={12} count={3} />
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

  const family = data.family;

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <View style={{ padding: space[4], gap: space[1] }}>
        <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
          {family.name}
        </Text>
        <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
          {family.members.length === 1
            ? "1 integrante"
            : `${family.members.length} integrantes`}
        </Text>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={family.members}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        windowSize={7}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews
      />
      {family.myRole === "ADMIN" ? (
        <View style={{ padding: space[4] }}>
          <Button
            label="Gerenciar membros"
            onPress={handleManage}
            variant="secondary"
            fullWidth
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
