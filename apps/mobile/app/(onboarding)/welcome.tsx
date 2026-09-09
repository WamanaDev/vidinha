import { View, Text, StyleSheet } from "react-native";
import { theme } from "@config/theme";

// SUPOSIÇÃO: placeholder — specs/mobile/routes/onboarding/create-or-join-family.md
// não fazia parte do escopo desta tarefa. Rota mantida navegável como destino
// do redirect em src/lib/activeFamilyContext.tsx quando `myFamilies` é vazio.
export default function OnboardingWelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Criar ou entrar em uma família — em construção
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
