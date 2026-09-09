import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: specs/mobile/routes/tabs/home.md não fazia parte do escopo desta
// tarefa (dashboard consolidado depende de accounts+transactions+recurring,
// mais complexo). Placeholder para a rota existir e a tab bar funcionar.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Início — em construção</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  text: { color: theme.colors.text },
});
