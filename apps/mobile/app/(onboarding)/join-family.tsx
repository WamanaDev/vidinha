import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useAcceptInvite } from "@features/family/hooks/useCreateOrJoinFamily";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/onboarding/create-or-join-family.md ("Entrar em
// família") — rota `/(onboarding)/join-family`. Mutation real:
// `acceptInvite(input: AcceptInviteInput!)`. Ao concluir, vai direto para as
// tabs, sem passar por convite de membros.
export default function JoinFamilyScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const [inviteToken, setInviteToken] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { mutateAsync, isPending, error } = useAcceptInvite();

  const handleJoin = useCallback(async () => {
    if (!inviteToken.trim()) {
      setFieldError("Cole ou digite o convite que vocês receberam.");
      return;
    }
    setFieldError(null);
    try {
      await mutateAsync(inviteToken.trim());
      router.replace("/");
    } catch {
      // erro já exposto via `error` abaixo
    }
  }, [inviteToken, mutateAsync, router]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Entrar em uma família
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
        Cole aqui o convite que alguém da família enviou para você.
      </Text>

      <TextInput
        label="Token do convite"
        value={inviteToken}
        onChangeText={setInviteToken}
        placeholder="Cole o convite aqui"
        autoCapitalize="none"
        error={
          fieldError ??
          (error
            ? mapErrorCodeToMessage((error as GraphQLApiError).code)
            : undefined)
        }
      />

      <Button
        label="Entrar na família"
        onPress={handleJoin}
        loading={isPending}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: space[5] },
});
