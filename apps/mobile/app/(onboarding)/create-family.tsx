import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useCreateFamily } from "@features/family/hooks/useCreateOrJoinFamily";
import { useOnboardingStore } from "@stores/onboardingStore";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/onboarding/create-or-join-family.md ("Criar família") —
// rota `/(onboarding)/create-family`. Mutation real: `createFamily(input:
// CreateFamilyInput!)`. Ao concluir, segue para invite-members.md.
export default function CreateFamilyScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const setFamilyName = useOnboardingStore((s) => s.setFamilyName);
  const setFamilyId = useOnboardingStore((s) => s.setFamilyId);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { mutateAsync, isPending, error } = useCreateFamily();

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setFieldError("Dê um nome para a família de vocês.");
      return;
    }
    setFieldError(null);
    try {
      const result = await mutateAsync(name.trim());
      setFamilyName(name.trim());
      setFamilyId(result.createFamily.family.id);
      router.replace("/(onboarding)/invite-members");
    } catch {
      // erro já exposto via `error` abaixo
    }
  }, [mutateAsync, name, router, setFamilyId, setFamilyName]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Como vocês querem chamar a família?
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
        Esse nome aparece para todo mundo que fizer parte dela.
      </Text>

      <TextInput
        label="Nome da família"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Família Silva"
        autoCapitalize="words"
        error={
          fieldError ??
          (error
            ? mapErrorCodeToMessage((error as GraphQLApiError).code)
            : undefined)
        }
      />

      <Button
        label="Criar família"
        onPress={handleCreate}
        loading={isPending}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: space[5] },
});
