import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { ErrorState } from "@components/ErrorState";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useSendOpenFinanceItemMfa } from "@features/open-finance/hooks/useOpenFinanceActions";
import { CredentialField } from "@features/open-finance/components/CredentialField";
import { validateCredentialValue } from "@features/open-finance/validation";
import { resolveOpenFinanceItemNextStep } from "@features/open-finance/itemResult";
import { useOpenFinanceConnectStore } from "@stores/openFinanceConnectStore";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";

// Terceiro passo do fluxo nativo de conexão Open Finance: a instituição pediu
// um segundo fator (token de app, código por SMS, etc.). `itemId`
// (`OpenFinanceItemResult.pluggyItemId`) chega por parâmetro de rota; o campo
// a exibir (`mfaParameter`) vem da store efêmera `useOpenFinanceConnectStore`
// (não dá pra serializar esse objeto inteiro na URL de forma prática — mesmo
// racional do `useOnboardingStore`).
export default function OpenFinanceConnectMfaScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { itemId: itemIdParam } = useLocalSearchParams<{ itemId: string }>();
  const { familyId } = useActiveFamily();

  const itemId = useOpenFinanceConnectStore((s) => s.itemId) ?? itemIdParam;
  const parameter = useOpenFinanceConnectStore((s) => s.parameter);
  const setItem = useOpenFinanceConnectStore((s) => s.setItem);
  const reset = useOpenFinanceConnectStore((s) => s.reset);

  const sendMfa = useSendOpenFinanceItemMfa(familyId);

  // Estado transiente do valor de MFA digitado — nunca persistido
  // (MASVS-STORAGE, mesmo racional de connect-form.tsx).
  const [value, setValue] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const error = useMemo(
    () => (parameter ? validateCredentialValue(parameter, value) : undefined),
    [parameter, value],
  );

  const handleSubmit = useCallback(() => {
    if (!parameter || !itemId) return;
    setAttemptedSubmit(true);
    if (error) return;

    setSubmitError(null);
    sendMfa.mutate(
      { itemId, parameters: [{ name: parameter.name, value }] },
      {
        onSuccess: (result) => {
          const item = result.sendOpenFinanceItemMfa;
          const nextStep = resolveOpenFinanceItemNextStep(item);
          switch (nextStep.kind) {
            case "success":
            case "pending":
              reset();
              router.replace("/open-finance/connections");
              break;
            case "mfa":
              // Mais uma rodada de MFA — atualiza o campo pedido e limpa o
              // valor digitado, permanecendo na mesma tela (loop).
              setItem(item.pluggyItemId, item.mfaParameter ?? null);
              setValue("");
              setAttemptedSubmit(false);
              break;
            case "qr":
            case "error":
              setSubmitError(
                nextStep.kind === "error"
                  ? nextStep.message
                  : "Essa instituição pediu uma confirmação que ainda não é suportada por aqui.",
              );
              break;
          }
        },
        onError: (err) => {
          setSubmitError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [parameter, itemId, error, sendMfa, value, reset, setItem, router]);

  if (!parameter || !itemId) {
    return (
      <ErrorState
        title="Sessão de conexão perdida"
        description="Volta e tenta conectar essa instituição de novo, por favor."
        onRetry={() => {
          reset();
          router.replace("/open-finance/connect");
        }}
      />
    );
  }

  if (submitError) {
    return (
      <ErrorState
        title="Não foi possível confirmar"
        description={submitError}
        onRetry={() => setSubmitError(null)}
      />
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      contentContainerStyle={{ padding: space[5] }}
      keyboardShouldPersistTaps="handled"
    >
      {parameter.instructions ? (
        <View style={{ marginBottom: space[4] }}>
          <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
            {parameter.instructions}
          </Text>
        </View>
      ) : null}
      <CredentialField
        credential={parameter}
        value={value}
        onChangeText={setValue}
        error={attemptedSubmit ? error : undefined}
      />
      <Button
        label="Confirmar"
        onPress={handleSubmit}
        loading={sendMfa.isPending}
        disabled={sendMfa.isPending || (attemptedSubmit && Boolean(error))}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
