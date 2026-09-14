import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { TextInput } from "@components/TextInput";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useOpenFinanceConnectors } from "@features/open-finance/hooks/useOpenFinanceConnectors";
import { ConnectorListItem } from "@features/open-finance/components/ConnectorListItem";
import { useOpenFinanceConnectStore } from "@stores/openFinanceConnectStore";
import type { OpenFinanceConnector } from "@features/open-finance/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { mapErrorCodeToMessage } from "@lib/errorMapping";

// specs/mobile/routes/stack/connect-open-finance.md (atualizada nesta tarefa):
// o widget web do Pluggy Connect (WebView) foi eliminado — a conexão agora é
// feita com telas nativas chamando `openFinanceConnectors` /
// `createOpenFinanceItem` / `sendOpenFinanceItemMfa` diretamente. Esta tela é
// o primeiro passo do novo fluxo: lista de instituições com busca local.
export default function OpenFinanceConnectScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const [search, setSearch] = useState("");
  const setConnectorId = useOpenFinanceConnectStore((s) => s.setConnectorId);

  const { data, isLoading, isError, error, refetch } =
    useOpenFinanceConnectors();

  const filteredConnectors = useMemo(() => {
    const connectors = data?.openFinanceConnectors ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return connectors;
    return connectors.filter((connector) =>
      connector.name.toLowerCase().includes(query),
    );
  }, [data, search]);

  const handleSelectConnector = useCallback(
    (connector: OpenFinanceConnector) => {
      setConnectorId(connector.id);
      // SUPOSIÇÃO: `as never` contorna um bug conhecido do gerador de typed
      // routes do Expo Router em ambiente Windows (o `.expo/types/router.d.ts`
      // regenerado localmente troca `/` por `\` nos novos arquivos de rota,
      // fazendo o `tsc` rejeitar hrefs válidos) — as rotas abaixo existem de
      // fato (`app/(app)/open-finance/connect-oauth.tsx` e `connect-form.tsx`).
      //
      // Checamos `oauthUrl` (não só `oauth`) porque alguns conectores reais
      // da Pluggy (ex.: "MeuPluggy", o conector de teste padrão) declaram
      // `oauth: true` mas não retornam `oauthUrl` nenhuma — abrir a WebView
      // nesse caso resulta em tela em branco travada, sem nada pra carregar.
      // Sem URL de OAuth, tratamos como fluxo direto (formulário, mesmo que
      // vazio quando `credentials` também estiver vazio).
      if (connector.oauth && connector.oauthUrl) {
        router.push({
          pathname: "/open-finance/connect-oauth",
          params: { connectorId: String(connector.id) },
        } as never);
      } else {
        router.push({
          pathname: "/open-finance/connect-form",
          params: { connectorId: String(connector.id) },
        } as never);
      }
    },
    [router, setConnectorId],
  );

  const renderItem = useCallback(
    ({ item }: { item: OpenFinanceConnector }) => (
      <ConnectorListItem
        connector={item}
        onPress={() => handleSelectConnector(item)}
      />
    ),
    [handleSelectConnector],
  );

  const keyExtractor = useCallback(
    (item: OpenFinanceConnector) => String(item.id),
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
        <Skeleton width="100%" height={64} borderRadius={12} count={8} />
      </View>
    );
  }

  if (isError) {
    const apiError = error as GraphQLApiError | undefined;
    return (
      <ErrorState
        title="Não foi possível carregar as instituições"
        description={mapErrorCodeToMessage(apiError?.code)}
        errorCode={apiError?.code}
        onRetry={refetch}
      />
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      contentContainerStyle={{ paddingBottom: space[8] }}
      data={filteredConnectors}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: space[4], paddingTop: space[4] }}>
          <TextInput
            label="Buscar instituição"
            value={search}
            onChangeText={setSearch}
            placeholder="Ex.: Nubank, Itaú, Bradesco..."
            autoCapitalize="none"
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="Nenhuma instituição encontrada"
          description="Tenta buscar com outro nome — talvez a gente ainda não tenha essa instituição por aqui."
        />
      }
      windowSize={7}
      maxToRenderPerBatch={12}
      initialNumToRender={12}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
