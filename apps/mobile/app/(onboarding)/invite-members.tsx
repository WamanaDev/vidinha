import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { ListItem } from "@components/ListItem";
import { useInviteMember } from "@features/family/hooks/useFamilyActions";
import { useOnboardingStore } from "@stores/onboardingStore";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/onboarding/invite-members.md — rota
// `/(onboarding)/invite-members`. Mutation real: `inviteMember(input:
// InviteMemberInput!)`, chamada uma vez por e-mail adicionado. Usa
// `useOnboardingStore` (familyId/inviteEmails) para manter estado entre o
// passo de criação da família e este. Botão "pular por agora" vai direto
// para as tabs.
export default function InviteMembersScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const familyId = useOnboardingStore((s) => s.familyId);
  const familyName = useOnboardingStore((s) => s.familyName);
  const inviteEmails = useOnboardingStore((s) => s.inviteEmails);
  const addInviteEmail = useOnboardingStore((s) => s.addInviteEmail);
  const removeInviteEmail = useOnboardingStore((s) => s.removeInviteEmail);
  const reset = useOnboardingStore((s) => s.reset);

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { mutateAsync, isPending, error } = useInviteMember(familyId);

  const handleAddInvite = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setFieldError("Digite um e-mail válido.");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setFieldError("Esse e-mail já foi convidado.");
      return;
    }
    setFieldError(null);
    try {
      await mutateAsync(trimmed);
      addInviteEmail(trimmed);
      setEmail("");
    } catch {
      // erro já exposto via `error` abaixo
    }
  }, [addInviteEmail, email, inviteEmails, mutateAsync]);

  const handleFinish = useCallback(() => {
    reset();
    router.replace("/");
  }, [reset, router]);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Quem mais faz parte da {familyName || "família"}?
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
        Convide por e-mail quem vocês querem que participe. Vocês também podem
        fazer isso depois.
      </Text>

      <TextInput
        label="E-mail do convidado"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="alguem@exemplo.com"
        error={
          fieldError ??
          (error
            ? mapErrorCodeToMessage((error as GraphQLApiError).code)
            : undefined)
        }
      />
      <Button
        label="Adicionar convite"
        onPress={handleAddInvite}
        variant="secondary"
        loading={isPending}
        fullWidth
      />

      {inviteEmails.length > 0 ? (
        <FlatList
          style={{ marginTop: space[4] }}
          data={inviteEmails}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <ListItem
              title={item}
              subtitle="Convite enviado"
              rightElement={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover convite de ${item}`}
                  onPress={() => removeInviteEmail(item)}
                  hitSlop={8}
                >
                  <X color={tokens.icon.default} size={18} />
                </Pressable>
              }
            />
          )}
        />
      ) : null}

      <View style={{ marginTop: space[8], gap: space[3] }}>
        <Button
          label="Concluir"
          onPress={handleFinish}
          variant="primary"
          fullWidth
        />
        <Button
          label="Pular por agora"
          onPress={handleFinish}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: space[5], paddingTop: space[12] },
});
