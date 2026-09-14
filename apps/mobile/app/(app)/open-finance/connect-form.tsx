import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useOpenFinanceConnectors } from "@features/open-finance/hooks/useOpenFinanceConnectors";
import { useCreateOpenFinanceItem } from "@features/open-finance/hooks/useOpenFinanceActions";
import { CredentialField } from "@features/open-finance/components/CredentialField";
import { validateCredentialValue } from "@features/open-finance/validation";
import { resolveOpenFinanceItemNextStep } from "@features/open-finance/itemResult";
import { useOpenFinanceConnectStore } from "@stores/openFinanceConnectStore";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import type { OpenFinanceUserAction } from "@features/open-finance/types";

// Formulário de credenciais nativo — segundo passo do fluxo de conexão
// Open Finance (ver `open-finance/connect.tsx` para o primeiro passo e o
// contexto da remoção do widget web da Pluggy).
export default function OpenFinanceConnectFormScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { connectorId: connectorIdParam } = useLocalSearchParams<{
    connectorId: string;
  }>();
  const connectorId = Number(connectorIdParam);
  const { familyId } = useActiveFamily();

  const { data, isLoading, isError, error, refetch } =
    useOpenFinanceConnectors();
  const createItem = useCreateOpenFinanceItem(familyId);
  const reset = useOpenFinanceConnectStore((s) => s.reset);
  const setItem = useOpenFinanceConnectStore((s) => s.setItem);

  const connector = data?.openFinanceConnectors.find(
    (c) => c.id === connectorId,
  );

  // Estado transiente do formulário — nunca persistido (MASVS-STORAGE, ver
  // comentário em src/stores/openFinanceConnectStore.ts).
  const [values, setValues] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // SUPOSIÇÃO: `userAction.type === 'qr'` é raro (poucos conectores da Pluggy
  // usam QR code) e não há uma query de "reconsultar status" definida no
  // contrato desta tarefa — "continuar" aqui reenvia a mesma
  // `createOpenFinanceItem` como melhor esforço para o backend reavaliar o
  // item após o usuário autorizar no app do banco.
  const [pendingUserAction, setPendingUserAction] =
    useState<OpenFinanceUserAction | null>(null);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const errors = useMemo(() => {
    if (!connector) return {} as Record<string, string | undefined>;
    const result: Record<string, string | undefined> = {};
    for (const credential of connector.credentials) {
      result[credential.name] = validateCredentialValue(
        credential,
        values[credential.name] ?? "",
      );
    }
    return result;
  }, [connector, values]);

  const isFormValid = useMemo(
    () => Object.values(errors).every((message) => !message),
    [errors],
  );

  const handleSubmit = useCallback(() => {
    if (!connector) return;
    setAttemptedSubmit(true);
    if (!isFormValid) return;

    setSubmitError(null);
    createItem.mutate(
      {
        familyId,
        connectorId: connector.id,
        parameters: connector.credentials.map((credential) => ({
          name: credential.name,
          value: values[credential.name] ?? "",
        })),
      },
      {
        onSuccess: (result) => {
          const item = result.createOpenFinanceItem;
          const nextStep = resolveOpenFinanceItemNextStep(item);
          switch (nextStep.kind) {
            case "success":
            case "pending":
              reset();
              router.replace("/open-finance/connections");
              break;
            case "mfa":
              setItem(item.pluggyItemId, item.mfaParameter ?? null);
              // SUPOSIÇÃO: `as never` contorna um bug conhecido do gerador de
              // typed routes do Expo Router no Windows (ver comentário
              // equivalente em `open-finance/connect.tsx`).
              router.push({
                pathname: "/open-finance/connect-mfa",
                params: { itemId: item.pluggyItemId },
              } as never);
              break;
            case "qr":
              setPendingUserAction(item.userAction ?? null);
              break;
            case "error":
              setSubmitError(nextStep.message);
              break;
          }
        },
        onError: (err) => {
          setSubmitError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [
    connector,
    isFormValid,
    createItem,
    familyId,
    values,
    reset,
    setItem,
    router,
  ]);

  const handleContinueAfterQr = useCallback(() => {
    setPendingUserAction(null);
    handleSubmit();
  }, [handleSubmit]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[5] },
        ]}
      >
        <Skeleton width="100%" height={60} borderRadius={12} count={3} />
      </View>
    );
  }

  if (isError || !connector) {
    const apiError = error as GraphQLApiError | undefined;
    return (
      <ErrorState
        title="Não foi possível carregar o formulário"
        description={
          isError
            ? mapErrorCodeToMessage(apiError?.code)
            : "Não encontramos essa instituição. Volta e tenta escolher de novo."
        }
        errorCode={apiError?.code}
        onRetry={isError ? refetch : undefined}
      />
    );
  }

  if (submitError) {
    return (
      <ErrorState
        title="Não foi possível conectar"
        description={submitError}
        onRetry={() => setSubmitError(null)}
      />
    );
  }

  if (pendingUserAction) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: tokens.bg.app,
            padding: space[5],
            justifyContent: "center",
          },
        ]}
      >
        <Text
          style={[
            typeScale.h2,
            { color: tokens.text.primary, marginBottom: space[3] },
          ]}
        >
          Confirma no app do seu banco
        </Text>
        {pendingUserAction.instructions ? (
          <Text
            style={[
              typeScale.body,
              { color: tokens.text.secondary, marginBottom: space[6] },
            ]}
          >
            {pendingUserAction.instructions}
          </Text>
        ) : null}
        <Button
          label="Já autorizei, continuar"
          onPress={handleContinueAfterQr}
          loading={createItem.isPending}
          disabled={createItem.isPending}
          fullWidth
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg.app }]}
      contentContainerStyle={{ padding: space[5] }}
      keyboardShouldPersistTaps="handled"
    >
      {connector.credentials.map((credential) => (
        <CredentialField
          key={credential.name}
          credential={credential}
          value={values[credential.name] ?? ""}
          onChangeText={(value) => handleChange(credential.name, value)}
          error={
            attemptedSubmit || (values[credential.name] ?? "").length > 0
              ? errors[credential.name]
              : undefined
          }
        />
      ))}
      <Button
        label="Conectar"
        onPress={handleSubmit}
        loading={createItem.isPending}
        disabled={createItem.isPending || (attemptedSubmit && !isFormValid)}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
