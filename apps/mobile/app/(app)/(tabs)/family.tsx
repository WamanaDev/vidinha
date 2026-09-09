import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: placeholder — specs/mobile/routes/tabs/family.md fora do escopo desta tarefa.
export default function FamilyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Família — em construção</Text>
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
