import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { Avatar } from "@components/Avatar";
import { useMe } from "@features/settings/hooks/useMe";
import {
  useCompleteUserProfile,
  useUploadAvatar,
} from "@features/settings/hooks/useSettingsActions";
import { AvatarValidationError } from "@features/settings/lib/avatarUpload";
import { getInitials } from "@lib/avatarInitials";
import { useCachedAvatarUri } from "@lib/useCachedAvatarUri";
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
  const {
    mutate: uploadAvatar,
    isPending: isUploadingAvatar,
    error: avatarError,
  } = useUploadAvatar();

  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.me) {
      setDisplayName(data.me.displayName ?? "");
    }
  }, [data?.me]);

  const cachedAvatarUri = useCachedAvatarUri(data?.me.id, data?.me.avatarUrl);

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) {
      return;
    }
    setSaved(false);
    try {
      await mutateAsync({ displayName: displayName.trim() });
      setSaved(true);
    } catch {
      // erro já exposto via `mutationError` abaixo
    }
  }, [displayName, mutateAsync]);

  const handlePickAvatar = useCallback(() => {
    if (!data?.me) return;
    const userId = data.me.id;
    const currentDisplayName = displayName.trim() || data.me.displayName || "";

    const pick = (source: "library" | "camera") => {
      uploadAvatar(
        { source, displayName: currentDisplayName, userId },
        {
          onError: (err) => {
            if (err instanceof AvatarValidationError) {
              Alert.alert("Não foi possível usar essa foto", err.message);
            }
            // Erros de rede/servidor já aparecem via `avatarError` abaixo.
          },
        },
      );
    };

    Alert.alert("Foto de perfil", "Escolha de onde pegar a foto", [
      { text: "Cancelar", style: "cancel" },
      { text: "Câmera", onPress: () => pick("camera") },
      { text: "Galeria", onPress: () => pick("library") },
    ]);
  }, [data?.me, displayName, uploadAvatar]);

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
            marginBottom: space[5],
          },
        ]}
      >
        {data.me.email}
      </Text>

      <Pressable
        onPress={handlePickAvatar}
        disabled={isUploadingAvatar}
        accessibilityRole="button"
        accessibilityLabel="Trocar foto de perfil"
        style={{
          alignSelf: "center",
          marginBottom: space[2],
          opacity: isUploadingAvatar ? 0.5 : 1,
        }}
      >
        <Avatar
          uri={cachedAvatarUri}
          fallbackInitials={getInitials(displayName || data.me.email)}
          size="lg"
        />
      </Pressable>
      <Text
        style={[
          typeScale.caption,
          {
            color: tokens.text.secondary,
            textAlign: "center",
            marginBottom: space[6],
          },
        ]}
      >
        {isUploadingAvatar ? "Enviando foto…" : "Toque para trocar a foto"}
      </Text>
      {avatarError && !(avatarError instanceof AvatarValidationError) ? (
        <Text
          style={[
            typeScale.caption,
            {
              color: tokens.state.error.fg,
              textAlign: "center",
              marginBottom: space[4],
            },
          ]}
        >
          Não foi possível enviar a foto. Tente novamente.
        </Text>
      ) : null}

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
