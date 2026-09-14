import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCreateTransaction } from "@features/transactions/hooks/useTransactionActions";
import { useAccounts } from "@features/accounts/hooks/useAccounts";
import { useCards } from "@features/cards/hooks/useCards";
import { AccountPickerSheet } from "@features/accounts/components/AccountPickerSheet";
import { CardPickerSheet } from "@features/cards/components/CardPickerSheet";
import { CategoryPickerSheet } from "@features/categories/components/CategoryPickerSheet";
import type { AccountWithInstitution } from "@features/accounts/types";
import type { Card } from "@features/cards/types";
import type { Category } from "@features/categories/types";
import { TRANSACTION_TYPE_LABELS } from "@features/transactions/transactionTypeLabels";
import type { TransactionType } from "@app-types/graphql-generated";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

type Destination =
  | { kind: "account"; account: AccountWithInstitution }
  | { kind: "card"; card: Card }
  | null;

// Nova tela — CRUD manual de lançamentos (funcionalidade nova desta tarefa),
// mesmo padrão estrutural de `recurring-expenses/new.tsx`. Rota
// `/(app)/transaction/new` (não conflita com `/(app)/transaction/[id]`, já
// existente para o detalhe).
export default function NewTransactionScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const createTransaction = useCreateTransaction();

  const { accounts } = useAccounts(familyId);
  const { data: cardsData } = useCards(familyId);
  // Regra do backend: um lançamento manual só pode ir em conta/cartão manual
  // — contas sincronizadas via Open Finance ficam de fora deste seletor.
  // (Ver SUPOSIÇÃO em `CardPickerSheet.tsx`: o SDL de `Card` não expõe campo
  // equivalente a `isManual`/`connection`, então cartões não são filtrados.)
  const manualAccounts = accounts.filter((a) => a.isManual);
  const allCards = cardsData?.cards ?? [];

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [type, setType] = useState<TransactionType>("DEBIT");
  const [dateText, setDateText] = useState("");
  const [destination, setDestination] = useState<Destination>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isAccountPickerVisible, setAccountPickerVisible] = useState(false);
  const [isCardPickerVisible, setCardPickerVisible] = useState(false);
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const amount = Number(amountText.replace(",", "."));
  const isValid =
    description.trim().length > 0 &&
    !Number.isNaN(amount) &&
    amount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateText.trim()) &&
    destination !== null;

  const handleSubmit = useCallback(() => {
    if (!isValid || !destination) return;
    setFormError(null);
    createTransaction.mutate(
      {
        accountId:
          destination.kind === "account" ? destination.account.id : undefined,
        cardId: destination.kind === "card" ? destination.card.id : undefined,
        categoryId: selectedCategory?.id,
        description: description.trim(),
        amount,
        type,
        occurredAt: new Date(`${dateText.trim()}T00:00:00.000Z`).toISOString(),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [
    isValid,
    destination,
    selectedCategory,
    description,
    amount,
    type,
    dateText,
    createTransaction,
    router,
  ]);

  const destinationLabel =
    destination?.kind === "account"
      ? destination.account.name
      : destination?.kind === "card"
        ? destination.card.name
        : "Escolher destino";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex.: Mercado da semana"
      />
      <TextInput
        label="Valor"
        value={amountText}
        onChangeText={setAmountText}
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
          Tipo
        </Text>
        <View style={{ flexDirection: "row", gap: space[3] }}>
          <View style={{ flex: 1 }}>
            <Button
              label={TRANSACTION_TYPE_LABELS.CREDIT}
              onPress={() => setType("CREDIT")}
              variant={type === "CREDIT" ? "primary" : "secondary"}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={TRANSACTION_TYPE_LABELS.DEBIT}
              onPress={() => setType("DEBIT")}
              variant={type === "DEBIT" ? "primary" : "secondary"}
              fullWidth
            />
          </View>
        </View>
      </View>

      {/* SUPOSIÇÃO: não há um componente de seleção de data no design system
          (mesma decisão de `recurring-expenses/new.tsx`) — data em texto
          AAAA-MM-DD. */}
      <TextInput
        label="Data (AAAA-MM-DD)"
        value={dateText}
        onChangeText={setDateText}
        placeholder="Ex.: 2026-09-14"
        keyboardType="numeric"
      />

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Conta ou cartão
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: space[3],
            marginBottom: space[3],
          }}
        >
          <View style={{ flex: 1 }}>
            <Button
              label="Escolher conta"
              onPress={() => setAccountPickerVisible(true)}
              variant="secondary"
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Escolher cartão"
              onPress={() => setCardPickerVisible(true)}
              variant="secondary"
              fullWidth
            />
          </View>
        </View>
        <Text style={[typeScale.body, { color: tokens.text.primary }]}>
          {destinationLabel}
        </Text>
      </View>

      <View style={{ marginBottom: space[6] }}>
        <Text
          style={[
            typeScale.label,
            { color: tokens.text.secondary, marginBottom: space[1] + 2 },
          ]}
        >
          Categoria (opcional)
        </Text>
        <Button
          label={selectedCategory?.name ?? "Escolher categoria"}
          onPress={() => setCategoryPickerVisible(true)}
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
        label="Criar lançamento"
        onPress={handleSubmit}
        loading={createTransaction.isPending}
        disabled={!isValid}
        fullWidth
      />

      <AccountPickerSheet
        isVisible={isAccountPickerVisible}
        onClose={() => setAccountPickerVisible(false)}
        accounts={manualAccounts}
        selectedAccountId={
          destination?.kind === "account" ? destination.account.id : undefined
        }
        onSelect={(account) => setDestination({ kind: "account", account })}
      />
      <CardPickerSheet
        isVisible={isCardPickerVisible}
        onClose={() => setCardPickerVisible(false)}
        cards={allCards}
        selectedCardId={
          destination?.kind === "card" ? destination.card.id : undefined
        }
        onSelect={(card) => setDestination({ kind: "card", card })}
      />
      <CategoryPickerSheet
        isVisible={isCategoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        familyId={familyId}
        selectedCategoryId={selectedCategory?.id}
        onSelect={setSelectedCategory}
      />
    </ScrollView>
  );
}
