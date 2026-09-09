import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { User, ShieldCheck, Download, Bell, LogOut } from "lucide-react-native";
import { ListItem } from "@components/ListItem";
import { useAuth } from "@lib/authContext";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/settings/profile.md ("Menu de configurações") —
// rota `/(app)/settings`. Query real: `me`, mas o menu em si só precisa
// listar os destinos — cada tela busca `me` de novo via `useMe()`.
export default function SettingsMenuScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { signOut } = useAuth();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace("/(auth)/login");
  }, [router, signOut]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text
        style={[
          typeScale.h1,
          { color: tokens.text.primary, padding: space[4] },
        ]}
      >
        Configurações
      </Text>

      <ListItem
        title="Perfil"
        subtitle="Nome e foto"
        leftElement={<User color={tokens.icon.default} size={22} />}
        onPress={() => router.push("/(app)/settings/profile")}
      />
      <ListItem
        title="Segurança"
        subtitle="Autenticação em dois fatores"
        leftElement={<ShieldCheck color={tokens.icon.default} size={22} />}
        onPress={() => router.push("/(app)/settings/security")}
      />
      <ListItem
        title="Notificações"
        subtitle="O que a gente avisa vocês"
        leftElement={<Bell color={tokens.icon.default} size={22} />}
        onPress={() => router.push("/(app)/settings/notifications")}
      />
      <ListItem
        title="Meus dados"
        subtitle="Exportar ou excluir sua conta"
        leftElement={<Download color={tokens.icon.default} size={22} />}
        onPress={() => router.push("/(app)/settings/export-data")}
      />
      <ListItem
        title="Sair"
        leftElement={<LogOut color={tokens.state.error.fg} size={22} />}
        onPress={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
