import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { EmptyState } from "@components/EmptyState";
import { Skeleton } from "@components/Skeleton";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useMe } from "@features/settings/hooks/useMe";
import { useRecurringExpenseDetail } from "@features/recurring-expenses/hooks/useRecurringExpenseDetail";
import {
  useUpdateRecurringExpense,
  useDeleteRecurringExpense,
} from "@features/recurring-expenses/hooks/useRecurringExpenseActions";
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

// specs/mobile/routes/stack/recurring-expenses.md §Editar — rota
// `/(app)/recurring-expenses/[id]/edit`. Campos exatos de
// `UpdateRecurringExpenseInput` (packages/graphql-schema/schema.graphql linhas 350-360).
export default function EditRecurringExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { data: meData, isLoading: isLoadingMe } = useMe();
  const { recurringExpense, isLoading, isError } = useRecurringExpenseDetail(
    familyId,
    id,
  );
  const updateRecurringExpense = useUpdateRecurringExpense(familyId);
  const deleteRecurringExpense = useDeleteRecurringExpense(familyId);

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [dueDayText, setDueDayText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isFrequencyPickerVisible, setFrequencyPickerVisible] = useState(false);
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (recurringExpense) {
      setDescription(recurringExpense.description);
      setAmountText(String(recurringExpense.amount));
      setFrequency(recurringExpense.frequency);
      // SUPOSIÇÃO: `RecurringExpense` (Query) só expõe `nextDueDate`, não
      // `dueDay`/`startDate` (esses só existem nos inputs de
      // create/update) — usamos o dia de `nextDueDate` como valor inicial do
      // campo "dia do vencimento" para edição. `startDate` não é reenviado no
      // update (não faz parte de `UpdateRecurringExpenseInput` de forma
      // obrigatória e alterar o início de uma recorrência já ativa é uma
      // decisão de produto que não cabe inventar aqui), então o campo de data
      // de início não aparece nesta tela — só na criação.
      const next = new Date(recurringExpense.nextDueDate);
      setDueDayText(String(next.getUTCDate()));
    }
  }, [recurringExpense]);

  useEffect(() => {
    setSelectedCategory(recurringExpense?.category ?? null);
  }, [recurringExpense]);

  const isOwner = Boolean(
    meData?.me?.id && recurringExpense?.owner?.id === meData.me.id,
  );

  const amount = Number(amountText.replace(",", "."));
  const dueDay = Number(dueDayText);
  const isValid =
    description.trim().length > 0 &&
    !Number.isNaN(amount) &&
    amount > 0 &&
    Number.isInteger(dueDay) &&
    dueDay >= 1 &&
    dueDay <= 31;

  const handleSave = useCallback(() => {
    if (!recurringExpense || !isValid) return;
    setFormError(null);
    updateRecurringExpense.mutate(
      {
        id: recurringExpense.id,
        description: description.trim(),
        amount,
        frequency,
        dueDay,
        categoryId: selectedCategory?.id ?? null,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [
    recurringExpense,
    isValid,
    description,
    amount,
    frequency,
    dueDay,
    selectedCategory,
    updateRecurringExpense,
    router,
  ]);

  const handleDelete = useCallback(() => {
    if (!recurringExpense) return;
    Alert.alert(
      "Excluir despesa recorrente?",
      `"${recurringExpense.description}" vai parar de aparecer para a família.`,
      [
        { text: "Deixar como está", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setFormError(null);
            deleteRecurringExpense.mutate(recurringExpense.id, {
              onSuccess: () => router.back(),
              onError: (err) => {
                setFormError(
                  mapErrorCodeToMessage((err as GraphQLApiError)?.code),
                );
              },
            });
          },
        },
      ],
    );
  }, [recurringExpense, deleteRecurringExpense, router]);

  if (!id) {
    return (
      <EmptyState
        title="Despesa recorrente não encontrada"
        description="O link que você usou não é válido."
        actionLabel="Voltar para despesas recorrentes"
        onAction={() => router.replace("/(app)/recurring-expenses")}
      />
    );
  }

  if (isLoading || isLoadingMe) {
    return (
      <View
        style={{ flex: 1, backgroundColor: tokens.bg.app, padding: space[5] }}
      >
        <Skeleton width="100%" height={52} borderRadius={8} count={4} />
      </View>
    );
  }

  if (isError || !recurringExpense) {
    return (
      <EmptyState
        title="Não achamos essa despesa recorrente"
        description="Ela pode ter sido excluída. Volte para a lista e tente de novo."
        actionLabel="Voltar para despesas recorrentes"
        onAction={() => router.replace("/(app)/recurring-expenses")}
      />
    );
  }

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

      {!isOwner ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.secondary, marginBottom: space[4] },
          ]}
        >
          Só quem criou esta despesa recorrente pode editá-la ou excluí-la.
        </Text>
      ) : null}

      {formError ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginBottom: space[4] },
          ]}
        >
          {formError}
        </Text>
      ) : null}

      {isOwner ? (
        <>
          <Button
            label="Salvar"
            onPress={handleSave}
            loading={updateRecurringExpense.isPending}
            disabled={!isValid}
            fullWidth
          />
          <View style={{ marginTop: space[4] }}>
            <Button
              label="Excluir despesa recorrente"
              onPress={handleDelete}
              loading={deleteRecurringExpense.isPending}
              variant="destructive"
              fullWidth
            />
          </View>
        </>
      ) : null}

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
