import { Switch, Text, View, StyleSheet } from "react-native";
import { Card } from "@components/Card";
import { useNotificationPreferencesStore } from "@stores/notificationPreferencesStore";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/settings/notifications.md — rota
// `/(app)/settings/notifications`.
//
// SUPOSIÇÃO: não há mutation/tipo `NotificationPreferences` no SDL real
// (packages/graphql-schema/schema.graphql) — esta tela é um placeholder de UI
// com estado local (`useNotificationPreferencesStore`, Zustand), sem
// persistência no backend, até que o schema seja estendido pelo time de API
// (specs/mobile/00-overview.md, "Suposições desta spec" #3).
export default function NotificationsScreen() {
  const tokens = useTokens();
  const billsDueSoon = useNotificationPreferencesStore((s) => s.billsDueSoon);
  const aboveAverageSpending = useNotificationPreferencesStore(
    (s) => s.aboveAverageSpending,
  );
  const toggleBillsDueSoon = useNotificationPreferencesStore(
    (s) => s.toggleBillsDueSoon,
  );
  const toggleAboveAverageSpending = useNotificationPreferencesStore(
    (s) => s.toggleAboveAverageSpending,
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Notificações
      </Text>
      <Text
        style={[
          typeScale.body,
          {
            color: tokens.text.secondary,
            marginTop: space[2],
            marginBottom: space[6],
          },
        ]}
      >
        Essas preferências ainda ficam só neste aparelho — em breve vocês vão
        poder sincronizar entre dispositivos.
      </Text>

      <Card padding="md">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[typeScale.body, { color: tokens.text.primary }]}>
              Contas a vencer
            </Text>
            <Text style={[typeScale.caption, { color: tokens.text.secondary }]}>
              Avisar quando uma conta compartilhada estiver perto do vencimento.
            </Text>
          </View>
          <Switch
            value={billsDueSoon}
            onValueChange={toggleBillsDueSoon}
            trackColor={{
              false: tokens.border.default,
              true: tokens.action.primary.bg,
            }}
          />
        </View>
      </Card>

      <View style={{ height: space[4] }} />

      <Card padding="md">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[typeScale.body, { color: tokens.text.primary }]}>
              Gasto acima da média
            </Text>
            <Text style={[typeScale.caption, { color: tokens.text.secondary }]}>
              Avisar quando uma categoria passar do que vocês costumam gastar.
            </Text>
          </View>
          <Switch
            value={aboveAverageSpending}
            onValueChange={toggleAboveAverageSpending}
            trackColor={{
              false: tokens.border.default,
              true: tokens.action.primary.bg,
            }}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space[5] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
});
