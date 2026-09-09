import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@components/Card";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useSharingPermissionFor } from "@features/sharing/hooks/useSharingPermissions";
import { useUpdateSharingPermission } from "@features/sharing/hooks/useUpdateSharingPermission";
import { SharingScopeToggle } from "@features/sharing/components/SharingScopeToggle";
import type { SharingScope } from "@features/sharing/types";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

const SCOPE_TITLE: Record<SharingScope, string> = {
  ACCOUNT: "Compartilhamento da conta",
  CARD: "Compartilhamento do cartão",
  CATEGORY: "Compartilhamento da categoria",
};

export interface SharingSettingsViewProps {
  scope: SharingScope;
  targetId: string;
}

// Corpo compartilhado das telas `sharing/account/[id]`, `sharing/card/[id]` e
// `sharing/category/[id]` (specs/mobile/routes/stack/sharing-settings.md).
// SUPOSIÇÃO: a navegação de entrada para esta tela (a partir da lista de
// Contas/Cartões) ainda não existe, porque os módulos `accounts`/`cards` do
// backend estão sendo implementados em paralelo em outra branch e as telas
// mobile correspondentes ainda não têm um link "Configurar compartilhamento".
// A rota fica pronta e navegável isoladamente (ex.: via `router.push`
// manual/deep link durante testes) — quando as telas de Contas/Cartões
// existirem, basta adicionar o `<ListItem onPress={...}>`/botão que navega
// para cá com o `id` do recurso.
export function SharingSettingsView({
  scope,
  targetId,
}: SharingSettingsViewProps) {
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const { isLoading, isError, error, refetch, permission } =
    useSharingPermissionFor(familyId, scope, targetId);
  const updatePermission = useUpdateSharingPermission(familyId);
  const [actionError, setActionError] = useState<string | null>(null);

  // Estado "ainda não compartilhado": nenhuma `SharingPermission` existe para
  // este recurso ainda (ver SUPOSIÇÃO em `sharing.graphql.ts` — não há
  // mutation de criação/upsert por scope+targetId no SDL real, só
  // `updateSharingPermission(id)`). Os toggles ficam desabilitados até o
  // registro existir.
  const sharedWithFamily = permission?.sharedWithFamily ?? false;
  const fullDetailShared = permission?.fullDetailShared ?? false;
  const hasPermission = Boolean(permission);

  const handleToggleShared = useCallback(
    (value: boolean) => {
      if (!permission) return;
      setActionError(null);
      updatePermission.mutate(
        { id: permission.id, sharedWithFamily: value },
        {
          onError: (err) => {
            setActionError(
              (err as GraphQLApiError)?.message ??
                "Não conseguimos salvar essa alteração agora.",
            );
          },
        },
      );
    },
    [permission, updatePermission],
  );

  const handleToggleFullDetail = useCallback(
    (value: boolean) => {
      if (!permission) return;
      setActionError(null);
      updatePermission.mutate(
        { id: permission.id, fullDetailShared: value },
        {
          onError: (err) => {
            setActionError(
              (err as GraphQLApiError)?.message ??
                "Não conseguimos salvar essa alteração agora.",
            );
          },
        },
      );
    },
    [permission, updatePermission],
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[5] },
        ]}
      >
        <Skeleton width="100%" height={64} borderRadius={12} count={2} />
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.bg.app, padding: space[5] },
      ]}
    >
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        {SCOPE_TITLE[scope]}
      </Text>

      {!hasPermission ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.secondary, marginTop: space[2] },
          ]}
        >
          Ainda não há nada compartilhado por aqui. Assim que este item for
          conectado, vocês poderão configurar o compartilhamento.
        </Text>
      ) : null}

      {actionError ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginTop: space[2] },
          ]}
        >
          {actionError}
        </Text>
      ) : null}

      <Card padding="md" elevation="low">
        <View style={{ marginTop: space[2] }}>
          <SharingScopeToggle
            label="Compartilhar com a família"
            description="Vocês veem que este item existe e um resumo consolidado."
            value={sharedWithFamily}
            onValueChange={handleToggleShared}
            disabled={!hasPermission || updatePermission.isPending}
          />
          <View
            style={{
              height: 1,
              backgroundColor: tokens.border.default,
            }}
          />
          <SharingScopeToggle
            label="Compartilhar detalhe completo"
            description="A família também vê os valores e lançamentos individuais, não só o resumo."
            value={fullDetailShared}
            onValueChange={handleToggleFullDetail}
            disabled={
              !hasPermission || !sharedWithFamily || updatePermission.isPending
            }
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
