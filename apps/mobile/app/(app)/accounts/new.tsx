import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCreateAccount } from "@features/accounts/hooks/useAccountActions";
import { AccountTypePickerSheet } from "@features/accounts/components/AccountTypePickerSheet";
import { ACCOUNT_TYPE_LABELS } from "@features/accounts/accountTypeLabels";
import type { AccountType } from "@app-types/graphql-generated";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// Nova tela — não há spec dedicada em specs/mobile/routes/ para o CRUD manual
// de contas (funcionalidade nova desta tarefa). Segue o mesmo padrão
// estrutural de `recurring-expenses/new.tsx` (validação client-side +
// `useMutation` + `router.back()`). Rota `/(app)/accounts/new`.
export default function NewAccountScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const createAccount = useCreateAccount(familyId);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [balanceText, setBalanceText] = useState("");
  const [isTypePickerVisible, setTypePickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const balance = Number(balanceText.replace(",", "."));
  const isValid = name.trim().length > 0 && !Number.isNaN(balance);

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    setFormError(null);
    createAccount.mutate(
      {
        familyId,
        name: name.trim(),
        type,
        balance,
        // MVP sem suporte multi-moeda real ainda — sempre BRL.
        currency: "BRL",
      },
      {
        onSuccess: () => router.replace("/(app)/(tabs)/accounts"),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [isValid, familyId, name, type, balance, createAccount, router]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Nome da conta"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Carteira do dia a dia"
      />

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Tipo de conta
        </Text>
        <Button
          label={ACCOUNT_TYPE_LABELS[type]}
          onPress={() => setTypePickerVisible(true)}
          variant="secondary"
          fullWidth
        />
      </View>

      <TextInput
        label="Saldo inicial"
        value={balanceText}
        onChangeText={setBalanceText}
        placeholder="0,00"
        keyboardType="numeric"
      />

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Moeda
        </Text>
        {/* SUPOSIÇÃO: sem suporte multi-moeda real ainda (00-DECISIONS.md não
            define isso) — campo fixo em BRL, desabilitado no MVP. */}
        <Button
          label="BRL — Real brasileiro"
          onPress={() => {}}
          disabled
          fullWidth
        />
      </View>

      {formError ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginTop: space[4] },
          ]}
        >
          {formError}
        </Text>
      ) : null}

      <Button
        label="Criar conta"
        onPress={handleSubmit}
        loading={createAccount.isPending}
        disabled={!isValid}
        fullWidth
      />

      <AccountTypePickerSheet
        isVisible={isTypePickerVisible}
        onClose={() => setTypePickerVisible(false)}
        selected={type}
        onSelect={setType}
      />
    </ScrollView>
  );
}
