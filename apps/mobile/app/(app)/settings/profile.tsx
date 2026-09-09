import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useMe } from "@features/settings/hooks/useMe";
import { useCompleteUserProfile } from "@features/settings/hooks/useSettingsActions";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/settings/profile.md — rota `/(app)/settings/profile`.
// Query/Mutation reais: `me`, `completeUserProfile(input: CompleteProfileInput!)`.
export default function ProfileScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { data, isLoading, isError, error, refetch } = useMe();
  const {
    mutateAsync,
    isPending,
    error: mutationError,
  } = useCompleteUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.me) {
      setDisplayName(data.me.displayName ?? "");
      setAvatarUrl(data.me.avatarUrl ?? "");
    }
  }, [data?.me]);

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) {
      return;
    }
    setSaved(false);
    try {
      await mutateAsync({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      setSaved(true);
    } catch {
      // erro já exposto via `mutationError` abaixo
    }
  }, [avatarUrl, displayName, mutateAsync]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="100%" height={52} borderRadius={12} count={2} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Seu perfil
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
        {data.me.email}
      </Text>

      <TextInput
        label="Nome"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        placeholder="Como vocês querem te chamar"
        error={
          mutationError
            ? mapErrorCodeToMessage((mutationError as GraphQLApiError).code)
            : undefined
        }
      />
      <TextInput
        label="URL da foto (opcional)"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        autoCapitalize="none"
        placeholder="https://..."
      />

      {saved ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.success.fg, marginBottom: space[3] },
          ]}
        >
          Perfil atualizado.
        </Text>
      ) : null}

      <Button
        label="Salvar"
        onPress={handleSave}
        loading={isPending}
        fullWidth
      />
      <View style={{ marginTop: space[3] }}>
        <Button
          label="Voltar"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space[5] },
});
