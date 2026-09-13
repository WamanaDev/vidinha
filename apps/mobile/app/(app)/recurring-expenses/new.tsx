import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCreateRecurringExpense } from "@features/recurring-expenses/hooks/useRecurringExpenseActions";
import { FrequencyPickerSheet } from "@features/recurring-expenses/components/FrequencyPickerSheet";
import { FREQUENCY_LABELS } from "@features/recurring-expenses/frequencyLabels";
import type { RecurrenceFrequency } from "@features/recurring-expenses/types";
import { CategoryPickerSheet } from "@features/categories/components/CategoryPickerSheet";
import type { Category } from "@features/categories/types";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/recurring-expenses.md §Criar — rota
// `/(app)/recurring-expenses/new`. Campos exatos de `CreateRecurringExpenseInput`
// (packages/graphql-schema/schema.graphql linhas 339-348).
export default function NewRecurringExpenseScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const createRecurringExpense = useCreateRecurringExpense(familyId);

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [dueDayText, setDueDayText] = useState("");
  // SUPOSIÇÃO: não há um componente de seleção de data no design system
  // (specs/mobile/design-system não lista um "DatePicker"). `startDate` é uma
  // data completa (DateTime!) no SDL — pedimos como texto no formato
  // AAAA-MM-DD (o mais simples de validar/parsear) em vez de inventar um
  // componente de calendário fora do escopo desta tarefa.
  const [startDateText, setStartDateText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isFrequencyPickerVisible, setFrequencyPickerVisible] = useState(false);
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const amount = Number(amountText.replace(",", "."));
  const dueDay = Number(dueDayText);
  const isValid =
    description.trim().length > 0 &&
    !Number.isNaN(amount) &&
    amount > 0 &&
    Number.isInteger(dueDay) &&
    dueDay >= 1 &&
    dueDay <= 31 &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDateText.trim());

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    setFormError(null);
    createRecurringExpense.mutate(
      {
        familyId,
        description: description.trim(),
        amount,
        frequency,
        dueDay,
        startDate: new Date(
          `${startDateText.trim()}T00:00:00.000Z`,
        ).toISOString(),
        categoryId: selectedCategory?.id,
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
    familyId,
    description,
    amount,
    frequency,
    dueDay,
    startDateText,
    selectedCategory,
    createRecurringExpense,
    router,
  ]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex.: Aluguel"
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
          Frequência
        </Text>
        <Button
          label={FREQUENCY_LABELS[frequency]}
          onPress={() => setFrequencyPickerVisible(true)}
          variant="secondary"
          fullWidth
        />
      </View>
      <TextInput
        label="Dia do vencimento (1-31)"
        value={dueDayText}
        onChangeText={setDueDayText}
        placeholder="Ex.: 10"
        keyboardType="numeric"
      />
      <TextInput
        label="Data de início (AAAA-MM-DD)"
        value={startDateText}
        onChangeText={setStartDateText}
        placeholder="Ex.: 2026-10-01"
        keyboardType="numeric"
      />

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
        label="Criar despesa recorrente"
        onPress={handleSubmit}
        loading={createRecurringExpense.isPending}
        disabled={!isValid}
        fullWidth
      />

      <FrequencyPickerSheet
        isVisible={isFrequencyPickerVisible}
        onClose={() => setFrequencyPickerVisible(false)}
        selected={frequency}
        onSelect={setFrequency}
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
