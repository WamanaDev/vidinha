import { Link, Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { EmptyState } from "@components/EmptyState";
import { theme } from "@config/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Não encontrado" }} />
      <View style={styles.container}>
        <EmptyState
          title="Essa tela não existe"
          description="Volte para o início e tente de novo."
        />
        <Link
          href="/"
          style={{ color: theme.colors.primary, textAlign: "center" }}
        >
          Ir para o início
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
