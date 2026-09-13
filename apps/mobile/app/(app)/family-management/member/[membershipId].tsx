import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useFamily } from "@features/family/hooks/useFamily";
import { useMe } from "@features/settings/hooks/useMe";
import {
  useLeaveFamily,
  usePromoteMember,
  useRemoveMember,
} from "@features/family/hooks/useFamilyActions";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

const ROLE_LABEL: Record<"ADMIN" | "MEMBER", string> = {
  ADMIN: "Administrador(a)",
  MEMBER: "Integrante",
};

// specs/mobile/routes/stack/family-members.md — rota
// `/(app)/family-management/member/[membershipId]`. Mutations reais:
// `promoteMember`/`removeMember` (packages/graphql-schema/schema.graphql).
// `leaveFamily` também vive aqui quando a tela é aberta para o próprio
// vínculo do usuário logado (SUPOSIÇÃO: a spec de rota não define uma tela
// separada para "sair da família" — reaproveitamos o detalhe do próprio
// membro, mais simples do que criar uma rota nova só para isso).
export default function MemberDetailScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  const { familyId } = useActiveFamily();
  const { data, isLoading, isError, error, refetch } = useFamily(familyId);
  const { data: meData } = useMe();

  const promoteMember = usePromoteMember(familyId);
  const removeMember = useRemoveMember(familyId);
  const leaveFamily = useLeaveFamily();
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePromote = useCallback(() => {
    if (!membershipId) return;
    setActionError(null);
    promoteMember.mutate(membershipId, {
      onError: (err) => {
        setActionError(
          (err as GraphQLApiError)?.message ??
            "Não conseguimos promover esse membro agora.",
        );
      },
      onSuccess: () => router.back(),
    });
  }, [membershipId, promoteMember, router]);

  const confirmAndRemove = useCallback(() => {
    if (!membershipId) return;
    Alert.alert(
      "Remover integrante",
      "Tem certeza que quer remover essa pessoa da família? Ela perde acesso a tudo que vocês compartilham por aqui.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            setActionError(null);
            removeMember.mutate(membershipId, {
              onError: (err) => {
                // Trata especificamente o FORBIDDEN de "último admin"
                // (apps/api/src/modules/family/family.service.ts#assertNotLastAdmin):
                // "Não é possível remover o único administrador da família.
                // Promova outro membro antes." — mostramos a mensagem exata
                // do backend em vez de um erro genérico, já que ela já
                // explica a ação corretiva ao usuário.
                setActionError(
                  (err as GraphQLApiError)?.message ??
                    "Não conseguimos remover esse membro agora.",
                );
              },
              onSuccess: () => router.back(),
            });
          },
        },
      ],
    );
  }, [membershipId, removeMember, router]);

  const confirmAndLeave = useCallback(() => {
    Alert.alert(
      "Sair da família",
      "Tem certeza que quer sair? Você perde acesso a tudo que a família compartilha por aqui.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            setActionError(null);
            leaveFamily.mutate(familyId, {
              onError: (err) => {
                setActionError(
                  (err as GraphQLApiError)?.message ??
                    "Não conseguimos processar sua saída agora.",
                );
              },
              onSuccess: () => router.replace("/(app)/(tabs)/family"),
            });
          },
        },
      ],
    );
  }, [familyId, leaveFamily, router]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[5] },
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

  const membership = data.family.members.find((m) => m.id === membershipId);
  if (!membership) {
    return (
      <ErrorState
        title="Não encontramos esse membro"
        description="Talvez ele já tenha saído da família."
        onRetry={refetch}
      />
    );
  }

  const isSelf = meData?.me.id === membership.user.id;
  const isActingAdmin = data.family.myRole === "ADMIN";
  const name = membership.user.displayName || membership.user.email;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.bg.app, padding: space[5] },
      ]}
    >
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>{name}</Text>
      <Text
        style={[
          typeScale.body,
          { color: tokens.text.secondary, marginTop: space[1] },
        ]}
      >
        {ROLE_LABEL[membership.role]}
      </Text>

      {actionError ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginTop: space[4] },
          ]}
        >
          {actionError}
        </Text>
      ) : null}

      <View style={{ marginTop: space[8], gap: space[3] }}>
        {isActingAdmin && !isSelf && membership.role === "MEMBER" ? (
          <Button
            label="Promover a administrador(a)"
            onPress={handlePromote}
            loading={promoteMember.isPending}
            variant="secondary"
            fullWidth
          />
        ) : null}

        {isActingAdmin && !isSelf ? (
          <Button
            label="Remover da família"
            onPress={confirmAndRemove}
            loading={removeMember.isPending}
            variant="destructive"
            fullWidth
          />
        ) : null}

        {isSelf ? (
          <Button
            label="Sair da família"
            onPress={confirmAndLeave}
            loading={leaveFamily.isPending}
            variant="destructive"
            fullWidth
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
