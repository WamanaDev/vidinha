import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useOpenFinanceConnectors } from "@features/open-finance/hooks/useOpenFinanceConnectors";
import { useCreateOpenFinanceItem } from "@features/open-finance/hooks/useOpenFinanceActions";
import { resolveOpenFinanceItemNextStep } from "@features/open-finance/itemResult";
import { useOpenFinanceConnectStore } from "@stores/openFinanceConnectStore";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";

// SUPOSIÇÃO: esquema de redirecionamento do fluxo OAuth de Open Finance ainda
// não confirmado com o time de backend/Pluggy — nada nos garante que esse é
// o `redirect_uri` de fato registrado no lado da Pluggy para conectores OAuth.
// Usado aqui como melhor esforço (best-effort) para destravar o fluxo
// enquanto a integração real não é validada com uma conta de sandbox; não é
// o caminho crítico desta tarefa (a maioria dos conectores brasileiros
// suportados hoje pela Pluggy usa usuário/senha, não OAuth).
const OAUTH_REDIRECT_URI = "vidinha://open-finance/oauth-callback";

export default function OpenFinanceConnectOAuthScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { connectorId: connectorIdParam } = useLocalSearchParams<{
    connectorId: string;
  }>();
  const connectorId = Number(connectorIdParam);
  const { familyId } = useActiveFamily();
  const { data } = useOpenFinanceConnectors();
  const createItem = useCreateOpenFinanceItem(familyId);
  const setItem = useOpenFinanceConnectStore((s) => s.setItem);
  const reset = useOpenFinanceConnectStore((s) => s.reset);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  const connector = data?.openFinanceConnectors.find(
    (c) => c.id === connectorId,
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (handledRef.current) return;
      if (!navState.url.startsWith(OAUTH_REDIRECT_URI)) return;

      handledRef.current = true;
      // Conectores OAuth ainda exigem `parameters` não-vazio no SDL real
      // (`CreateOpenFinanceItemInput.parameters: [CredentialParameterInput!]!`,
      // mínimo 1 item) — como não há credencial de formulário nesse fluxo
      // (a autorização já aconteceu na WebView), enviamos um parâmetro vazio
      // conhecido como best-effort. SUPOSIÇÃO: o contrato real de "o que
      // mandar" para conectores OAuth não foi validado com uma conta de
      // sandbox (ver comentário de topo do arquivo).
      createItem.mutate(
        {
          familyId,
          connectorId,
          parameters: [{ name: "oauth", value: "true" }],
        },
        {
          onSuccess: (result) => {
            const item = result.createOpenFinanceItem;
            const nextStep = resolveOpenFinanceItemNextStep(item);
            switch (nextStep.kind) {
              case "success":
              case "pending":
                reset();
                router.replace("/open-finance/connections");
                break;
              case "mfa":
                setItem(item.pluggyItemId, item.mfaParameter ?? null);
                // SUPOSIÇÃO: `as never` contorna um bug conhecido do gerador
                // de typed routes do Expo Router no Windows (ver comentário
                // equivalente em `open-finance/connect.tsx`).
                router.replace({
                  pathname: "/open-finance/connect-mfa",
                  params: { itemId: item.pluggyItemId },
                } as never);
                break;
              case "qr":
              case "error":
                handledRef.current = false;
                setError(
                  nextStep.kind === "error"
                    ? nextStep.message
                    : "A instituição pediu mais uma confirmação que ainda não é suportada por aqui.",
                );
                break;
            }
          },
          onError: () => {
            handledRef.current = false;
            setError(
              "Não foi possível concluir a conexão depois da autorização. Tenta de novo?",
            );
          },
        },
      );
    },
    [createItem, familyId, connectorId, reset, setItem, router],
  );

  if (error) {
    return (
      <ErrorState
        title="Não foi possível conectar"
        description={error}
        onRetry={() => {
          setError(null);
          handledRef.current = false;
        }}
      />
    );
  }

  if (!connector?.oauthUrl) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: tokens.bg.app, padding: space[5] },
        ]}
      >
        <Skeleton width="100%" height={240} borderRadius={16} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <WebView
        source={{ uri: connector.oauthUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        // Campos de login do banco são digitados aqui — não deixa o WebView
        // guardar cache/senha entre sessões (MASVS-STORAGE).
        incognito
        cacheEnabled={false}
        startInLoadingState
        renderLoading={() => (
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: tokens.bg.app, padding: space[5] },
            ]}
          >
            <Skeleton width="100%" height={240} borderRadius={16} />
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center" },
  webview: { flex: 1 },
});
