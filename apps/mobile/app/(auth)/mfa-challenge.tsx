import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: placeholder — specs/mobile/routes/auth/mfa-verification.md tem
// código de referência, mas não fazia parte do escopo pedido nesta tarefa
// (login/app-layout/transactions). Rota mantida navegável a partir de login.tsx.
export default function MfaChallengeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Verificação em duas etapas — em construção
      </Text>
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
