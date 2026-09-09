import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/onboarding/create-or-join-family.md ("Boas-vindas") —
// rota `/(onboarding)/welcome`. `myFamilies` já foi checada pelo
// `ActiveFamilyProvider` (@lib/activeFamilyContext.tsx) antes do redirect para
// cá — esta tela só apresenta a escolha entre criar ou entrar em uma família.
export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const tokens = useTokens();

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <View style={{ gap: space[2], marginBottom: space[12] }}>
        <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
          Vamos organizar a vidinha de vocês
        </Text>
        <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
          Criem uma família nova para começar, ou entrem em uma que já existe
          usando um convite.
        </Text>
      </View>

      <View style={{ gap: space[3] }}>
        <Button
          label="Criar uma família"
          onPress={() => router.push("/(onboarding)/create-family")}
          variant="primary"
          fullWidth
        />
        <Button
          label="Entrar com um convite"
          onPress={() => router.push("/(onboarding)/join-family")}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space[5],
  },
});
