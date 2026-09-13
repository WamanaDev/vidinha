import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter } from "expo-router";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { usePluggyConnectToken } from "@features/open-finance/hooks/usePluggyConnectToken";
import { useCreateOpenFinanceConnection } from "@features/open-finance/hooks/useOpenFinanceActions";
import {
  buildPluggyConnectWidgetUrl,
  PLUGGY_WIDGET_INJECTED_JAVASCRIPT,
} from "@features/open-finance/services/pluggyWidget";
import type { PluggyWidgetMessage } from "@features/open-finance/types";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/connect-open-finance.md — rota `/(app)/open-finance/connect`.
//
// Ponto de plataforma: o Pluggy Connect é um widget web (react-pluggy-connect,
// iframe/React DOM), sem SDK nativo para Expo/React Native. A integração aqui
// abre o widget dentro de uma WebView e escuta mensagens repassadas via
// `window.postMessage` -> `window.ReactNativeWebView.postMessage` (ver
// SUPOSIÇÕES em `src/features/open-finance/services/pluggyWidget.ts` sobre a
// URL exata e o formato do evento — precisam ser validadas com uma conta real
// do Pluggy).
export default function OpenFinanceConnectScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const [webviewReady, setWebviewReady] = useState(false);
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const handledRef = useRef(false);

  const {
    data: tokenData,
    isLoading: isLoadingToken,
    isError: isTokenError,
    error: tokenError,
    refetch: refetchToken,
  } = usePluggyConnectToken();

  const createConnection = useCreateOpenFinanceConnection(familyId);

  const widgetUrl = useMemo(() => {
    const connectToken = tokenData?.pluggyConnectToken.connectToken;
    return connectToken ? buildPluggyConnectWidgetUrl(connectToken) : null;
  }, [tokenData]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (handledRef.current) return;

      let message: PluggyWidgetMessage | null = null;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (!message) return;

      if (message.type === "SUCCESS") {
        handledRef.current = true;
        setCreatingConnection(true);
        createConnection.mutate(
          { itemId: message.itemId },
          {
            onSuccess: () => {
              router.replace("/open-finance/connections");
            },
            onError: () => {
              setCreatingConnection(false);
              handledRef.current = false;
              setWidgetError(
                "Não foi possível concluir a conexão. Tente novamente.",
              );
            },
          },
        );
      } else if (message.type === "ERROR") {
        setWidgetError(
          "Não foi possível conectar com a instituição. Tente novamente.",
        );
      } else if (message.type === "CLOSE") {
        router.back();
      }
    },
    [createConnection, router],
  );

  if (isTokenError) {
    return (
      <ErrorState
        title="Não foi possível iniciar a conexão"
        description={(tokenError as GraphQLApiError)?.message}
        errorCode={(tokenError as GraphQLApiError)?.code}
        onRetry={refetchToken}
      />
    );
  }

  if (widgetError) {
    return (
      <ErrorState
        title="Não foi possível conectar"
        description={widgetError}
        errorCode="UPSTREAM_ERROR"
        onRetry={() => {
          setWidgetError(null);
          handledRef.current = false;
          refetchToken();
        }}
      />
    );
  }

  if (isLoadingToken || !widgetUrl || creatingConnection) {
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
        source={{ uri: widgetUrl }}
        onMessage={handleMessage}
        injectedJavaScript={PLUGGY_WIDGET_INJECTED_JAVASCRIPT}
        onLoadEnd={() => setWebviewReady(true)}
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
        style={webviewReady ? styles.webview : styles.webviewHidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center" },
  webview: { flex: 1 },
  webviewHidden: { flex: 1, opacity: 0 },
});
