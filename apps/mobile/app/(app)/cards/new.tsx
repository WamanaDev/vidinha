import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCreateCard } from "@features/cards/hooks/useCardActions";
import { CardTypePickerSheet } from "@features/cards/components/CardTypePickerSheet";
import { CARD_TYPE_LABELS } from "@features/cards/cardTypeLabels";
import { useAccounts } from "@features/accounts/hooks/useAccounts";
import { AccountPickerSheet } from "@features/accounts/components/AccountPickerSheet";
import type { AccountWithInstitution } from "@features/accounts/types";
import type { CardType } from "@app-types/graphql-generated";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// Nova tela — CRUD manual de cartões (funcionalidade nova desta tarefa),
// mesmo padrão estrutural de `accounts/new.tsx`/`recurring-expenses/new.tsx`.
// Rota `/(app)/cards/new`.
export default function NewCardScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const createCard = useCreateCard(familyId);
  const { accounts } = useAccounts(familyId);
  // SUPOSIÇÃO: só faz sentido cobrar a fatura numa conta cadastrada
  // manualmente por esse mesmo usuário (mesma regra de "lançamento manual só
  // em recurso manual" citada na tarefa) — filtra `isManual` antes de listar.
  const manualAccounts = accounts.filter((a) => a.isManual);

  const [name, setName] = useState("");
  const [type, setType] = useState<CardType>("CREDIT");
  const [brand, setBrand] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [creditLimitText, setCreditLimitText] = useState("");
  const [billingAccount, setBillingAccount] =
    useState<AccountWithInstitution | null>(null);
  const [isTypePickerVisible, setTypePickerVisible] = useState(false);
  const [isAccountPickerVisible, setAccountPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const creditLimit = creditLimitText.trim()
    ? Number(creditLimitText.replace(",", "."))
    : undefined;
  const isValid =
    name.trim().length > 0 &&
    (!lastFourDigits || /^\d{4}$/.test(lastFourDigits.trim())) &&
    (creditLimit === undefined || !Number.isNaN(creditLimit));

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    setFormError(null);
    createCard.mutate(
      {
        familyId,
        name: name.trim(),
        type,
        brand: brand.trim() || undefined,
        lastFourDigits: lastFourDigits.trim() || undefined,
        billingAccountId: billingAccount?.id,
        creditLimit: type === "CREDIT" ? creditLimit : undefined,
      },
      {
        onSuccess: () => router.replace("/(app)/(tabs)/cards"),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [
    isValid,
    familyId,
    name,
    type,
    brand,
    lastFourDigits,
    billingAccount,
    creditLimit,
    createCard,
    router,
  ]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Nome do cartão"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Cartão Nubank"
      />

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Tipo de cartão
        </Text>
        <Button
          label={CARD_TYPE_LABELS[type]}
          onPress={() => setTypePickerVisible(true)}
          variant="secondary"
          fullWidth
        />
      </View>

      <TextInput
        label="Bandeira (opcional)"
        value={brand}
        onChangeText={setBrand}
        placeholder="Ex.: Visa, Mastercard"
      />

      <TextInput
        label="Últimos 4 dígitos (opcional)"
        value={lastFourDigits}
        onChangeText={setLastFourDigits}
        placeholder="Ex.: 1234"
        keyboardType="numeric"
        error={
          lastFourDigits && !/^\d{0,4}$/.test(lastFourDigits.trim())
            ? "Digite só os 4 últimos números"
            : undefined
        }
      />

      {type === "CREDIT" ? (
        <TextInput
          label="Limite de crédito (opcional)"
          value={creditLimitText}
          onChangeText={setCreditLimitText}
          placeholder="0,00"
          keyboardType="numeric"
        />
      ) : null}

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Conta de cobrança (opcional)
        </Text>
        <Button
          label={billingAccount?.name ?? "Nenhuma"}
          onPress={() => setAccountPickerVisible(true)}
          variant="secondary"
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
        label="Criar cartão"
        onPress={handleSubmit}
        loading={createCard.isPending}
        disabled={!isValid}
        fullWidth
      />

      <CardTypePickerSheet
        isVisible={isTypePickerVisible}
        onClose={() => setTypePickerVisible(false)}
        selected={type}
        onSelect={setType}
      />
      <AccountPickerSheet
        isVisible={isAccountPickerVisible}
        onClose={() => setAccountPickerVisible(false)}
        accounts={manualAccounts}
        selectedAccountId={billingAccount?.id}
        onSelect={setBillingAccount}
      />
    </ScrollView>
  );
}
