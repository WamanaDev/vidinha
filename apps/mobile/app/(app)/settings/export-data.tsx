import { useCallback, useState } from "react";
import { Alert, Linking, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import {
  useExportMyData,
  useRequestAccountDeletion,
} from "@features/settings/hooks/useSettingsActions";
import { useAuth } from "@lib/authContext";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/settings/data-export-deletion.md — rota
// `/(app)/settings/export-data`. Mutations reais: `exportMyData` e
// `requestAccountDeletion`.
//
// SUPOSIÇÃO: specs/mobile/00-overview.md e navigation.md descrevem
// `export-data.tsx` e `delete-account.tsx` como duas rotas separadas; a
// instrução desta tarefa pede uma única tela com os dois botões
// ("data-export-deletion.tsx"). Como a spec por rota não traz código de
// referência para nenhuma das duas, optamos pela versão mais simples: uma
// única tela reunindo exportação e exclusão, acessível a partir do menu de
// configurações.
export default function ExportDataScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { signOut } = useAuth();

  const {
    mutateAsync: exportData,
    isPending: isExporting,
    error: exportError,
  } = useExportMyData();
  const {
    mutateAsync: deleteAccount,
    isPending: isDeleting,
    error: deleteError,
  } = useRequestAccountDeletion();

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setDownloadUrl(null);
    try {
      const result = await exportData();
      setDownloadUrl(result.exportMyData.downloadUrl);
      setExpiresAt(result.exportMyData.expiresAt);
    } catch {
      // erro já exposto via `exportError` abaixo
    }
  }, [exportData]);

  const handleOpenDownload = useCallback(() => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl);
    }
  }, [downloadUrl]);

  const performDeletion = useCallback(async () => {
    try {
      await deleteAccount();
      await signOut();
      router.replace("/(auth)/login");
    } catch {
      // erro já exposto via `deleteError` abaixo
    }
  }, [deleteAccount, router, signOut]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      "Excluir sua conta",
      "Essa ação não pode ser desfeita. Todos os seus dados serão apagados. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir minha conta",
          style: "destructive",
          onPress: performDeletion,
        },
      ],
    );
  }, [performDeletion]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Meus dados
      </Text>

      <Card padding="md">
        <Text style={[typeScale.h3, { color: tokens.text.primary }]}>
          Exportar meus dados
        </Text>
        <Text
          style={[
            typeScale.body,
            {
              color: tokens.text.secondary,
              marginTop: space[1],
              marginBottom: space[4],
            },
          ]}
        >
          Geramos um arquivo com tudo o que temos sobre vocês.
        </Text>
        <Button
          label="Exportar meus dados"
          onPress={handleExport}
          loading={isExporting}
          variant="secondary"
          fullWidth
        />
        {exportError ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.state.error.fg, marginTop: space[2] },
            ]}
          >
            {mapErrorCodeToMessage((exportError as GraphQLApiError).code)}
          </Text>
        ) : null}
        {downloadUrl ? (
          <View style={{ marginTop: space[3] }}>
            <Text style={[typeScale.caption, { color: tokens.text.secondary }]}>
              {expiresAt
                ? `Link válido até ${new Date(expiresAt).toLocaleString("pt-BR")}.`
                : "Link pronto."}
            </Text>
            <Button
              label="Abrir link de download"
              onPress={handleOpenDownload}
              variant="ghost"
              size="sm"
            />
          </View>
        ) : null}
      </Card>

      <View style={{ height: space[6] }} />

      <Card padding="md">
        <Text style={[typeScale.h3, { color: tokens.state.error.fg }]}>
          Excluir minha conta
        </Text>
        <Text
          style={[
            typeScale.body,
            {
              color: tokens.text.secondary,
              marginTop: space[1],
              marginBottom: space[4],
            },
          ]}
        >
          Essa ação é permanente e não pode ser desfeita.
        </Text>
        <Button
          label="Excluir minha conta"
          onPress={handleDeletePress}
          loading={isDeleting}
          variant="destructive"
          fullWidth
        />
        {deleteError ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.state.error.fg, marginTop: space[2] },
            ]}
          >
            {mapErrorCodeToMessage((deleteError as GraphQLApiError).code)}
          </Text>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space[5] },
});
