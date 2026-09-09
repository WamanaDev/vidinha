import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: placeholder — sem spec de código de referência lida nesta tarefa.
export default function ResetPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redefinir senha — em construção</Text>
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
