import { EmptyState } from "@components/EmptyState";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCards } from "@features/cards/hooks/useCards";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import { View } from "react-native";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/tabs/cards.md — rota `/(app)/(tabs)/cards`.
// SUPOSIÇÃO: ver `src/features/cards/services/cards.graphql.ts` — o backend
// real (packages/graphql-schema/schema.graphql) não tem NENHUM tipo/query de
// cartão hoje (nem `Card`, nem `cards(familyId)`), diferente do que
// specs/mobile/routes/tabs/cards.md assume. Por isso esta tela sempre mostra
// o estado vazio, com uma mensagem explicando a situação — nunca inventa dado
// fake de cartão.
export default function CardsScreen() {
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useCards(familyId);
  const tokens = useTokens();

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

  // data?.cards está sempre vazio hoje (ver SUPOSIÇÃO acima), mas o check
  // fica explícito para o dia em que o backend passar a retornar cartões.
  return (
    <EmptyState
      title="Cartões chegando em breve"
      description={
        (data?.cards.length ?? 0) === 0
          ? "Ainda não conseguimos mostrar seus cartões por aqui — essa parte da integração com o banco está a caminho."
          : undefined
      }
    />
  );
}
