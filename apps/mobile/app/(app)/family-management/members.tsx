import { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { EmptyState } from "@components/EmptyState";
import { Button } from "@components/Button";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useFamily } from "@features/family/hooks/useFamily";
import { MemberListItem } from "@features/family/components/MemberListItem";
import type { FamilyMembership } from "@features/family/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/family-members.md — rota
// `/(app)/family-management/members`. Query real: `family(id).members`
// (packages/graphql-schema/schema.graphql). Acessível a partir do botão
// "Gerenciar membros" em `(tabs)/family.tsx` (só exibido para ADMIN).
export default function FamilyMembersScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useFamily(familyId);

  const handlePressMember = useCallback(
    (membershipId: string) => {
      router.push(`/family-management/member/${membershipId}`);
    },
    [router],
  );

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

  // SUPOSIÇÃO: entrada temporária de desenvolvimento para a tela
  // `sharing/account/[id]` — as telas de Contas/Cartões (onde esse link
  // deveria realmente aparecer) ainda não existem, pois os módulos
  // `accounts`/`cards` do backend estão sendo implementados em paralelo.
  // Remover assim que a tela de Contas ganhar seu próprio ponto de entrada
  // para "Configurar compartilhamento".
  const handleOpenSharingDevEntry = useCallback(() => {
    router.push("/sharing/account/dev-preview");
  }, [router]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="100%" height={64} borderRadius={12} count={4} />
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

  const members = data.family.members;

  // Empty: só o próprio usuário na família (specs/mobile/routes/stack/family-members.md).
  if (members.length <= 1) {
    return (
      <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
        <EmptyState
          title="Só você por aqui"
          description="Convide alguém para compartilhar a vidinha de vocês por aqui."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <FlatList
        style={{ flex: 1 }}
        data={members}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        windowSize={7}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews
      />
      {__DEV__ ? (
        <View style={{ padding: space[4] }}>
          <Button
            label="Testar tela de compartilhamento (dev)"
            onPress={handleOpenSharingDevEntry}
            variant="ghost"
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
