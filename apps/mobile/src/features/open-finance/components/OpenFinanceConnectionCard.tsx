import { memo } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type {
  ConnectionStatus,
  OpenFinanceConnection,
} from "@features/open-finance/types";

export interface OpenFinanceConnectionCardProps {
  connection: OpenFinanceConnection;
  onSync: () => void;
  onRevoke: () => void;
  syncing?: boolean;
  revoking?: boolean;
}

// SUPOSIÇÃO: specs/design não define uma paleta específica por
// `ConnectionStatus` — reaproveita os tokens semânticos já existentes
// (success/error/warning/neutral) mapeando cada status ao mais próximo, em
// vez de inventar cor nova fora dos tokens.
function useStatusLabel(status: ConnectionStatus): {
  label: string;
  tone: "success" | "error" | "warning";
} {
  switch (status) {
    case "CONNECTED":
      return { label: "Conectado", tone: "success" };
    case "UPDATING":
      return { label: "Atualizando...", tone: "warning" };
    case "OUTDATED":
      return { label: "Desatualizado", tone: "warning" };
    case "LOGIN_ERROR":
      return { label: "Erro de login", tone: "error" };
    case "ERROR":
      return { label: "Erro na conexão", tone: "error" };
    case "REVOKED":
      return { label: "Desconectado", tone: "error" };
  }
}

function OpenFinanceConnectionCardBase({
  connection,
  onSync,
  onRevoke,
  syncing = false,
  revoking = false,
}: OpenFinanceConnectionCardProps) {
  const tokens = useTokens();
  const { label, tone } = useStatusLabel(connection.status);
  const toneColor =
    tone === "success"
      ? tokens.state.success.fg
      : tone === "warning"
        ? tokens.state.warning.fg
        : tokens.state.error.fg;

  return (
    <Card padding="md">
      <View style={styles.header}>
        {connection.institutionLogoUrl ? (
          <Image
            source={{ uri: connection.institutionLogoUrl }}
            style={styles.logo}
            contentFit="contain"
          />
        ) : null}
        <View style={styles.headerText}>
          <Text
            numberOfLines={1}
            style={[typeScale.body, { color: tokens.text.primary }]}
          >
            {connection.institutionName}
          </Text>
          <Text style={[typeScale.caption, { color: toneColor }]}>{label}</Text>
        </View>
      </View>

      {connection.lastSyncedAt ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.secondary, marginTop: space[2] },
          ]}
        >
          Última sincronização:{" "}
          {new Date(connection.lastSyncedAt).toLocaleString("pt-BR")}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Sincronizar"
          variant="secondary"
          size="sm"
          onPress={onSync}
          loading={syncing}
          disabled={connection.status === "REVOKED"}
        />
        <Button
          label="Desconectar"
          variant="destructive"
          size="sm"
          onPress={onRevoke}
          loading={revoking}
          disabled={connection.status === "REVOKED"}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  logo: { width: 40, height: 40, borderRadius: 8 },
  headerText: { flex: 1 },
  actions: {
    flexDirection: "row",
    gap: space[3],
    marginTop: space[4],
  },
});

export const OpenFinanceConnectionCard = memo(OpenFinanceConnectionCardBase);
