import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: specs/mobile/routes/auth/signup.md não tinha código de referência
// completo lido nesta tarefa (fora do escopo pedido — apenas login/app-layout/
// transactions tinham código pronto a copiar). Placeholder mínimo para manter
// a rota referenciada por login.tsx navegável; implementação completa fica
// para uma tarefa dedicada a specs/mobile/routes/auth/signup.md.
export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cadastro — em construção</Text>
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
