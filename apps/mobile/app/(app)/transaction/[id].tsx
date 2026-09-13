import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Amount } from "@components/Amount";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { EmptyState } from "@components/EmptyState";
import { Skeleton } from "@components/Skeleton";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useMe } from "@features/settings/hooks/useMe";
import { useTransactionDetail } from "@features/transactions/hooks/useTransactionDetail";
import { useHideTransaction } from "@features/transactions/hooks/useHideTransaction";
import { useUpdateTransactionCategory } from "@features/transactions/hooks/useUpdateTransactionCategory";
import { CategoryPickerSheet } from "@features/categories/components/CategoryPickerSheet";
import type { Category } from "@features/categories/types";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/transaction-detail.md — rota `/(app)/transaction/[id]`.
export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { data: meData, isLoading: isLoadingMe } = useMe();
  const transaction = useTransactionDetail(id);

  const hideMutation = useHideTransaction();
  const categoryMutation = useUpdateTransactionCategory();

  // Atualização otimista de "ocultar da família" (specs/mobile/routes/stack/transaction-detail.md
  // §"Ocultar transação"): muda o estado local imediatamente, reverte se a mutation falhar.
  const [optimisticHidden, setOptimisticHidden] = useState<boolean | null>(
    null,
  );
  const [hideError, setHideError] = useState<string | null>(null);

  // `categories(familyId)` já existe no SDL real — seletor de verdade via
  // BottomSheet (`CategoryPickerSheet`), reaproveitado também nos formulários
  // de despesas recorrentes.
  const [isCategoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const handleToggleHide = useCallback(() => {
    if (!transaction) return;
    const nextHidden = !(optimisticHidden ?? transaction.hiddenFromFamily);
    setOptimisticHidden(nextHidden);
    setHideError(null);
    hideMutation.mutate(
      { transactionId: transaction.id, hiddenFromFamily: nextHidden },
      {
        onError: (err) => {
          // Reverte o otimismo em caso de falha.
          setOptimisticHidden(!nextHidden);
          setHideError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [transaction, optimisticHidden, hideMutation]);

  const handleSelectCategory = useCallback(
    (category: Category) => {
      if (!transaction) return;
      setCategoryError(null);
      categoryMutation.mutate(
        { transactionId: transaction.id, categoryId: category.id },
        {
          onError: (err) => {
            setCategoryError(
              mapErrorCodeToMessage((err as GraphQLApiError)?.code),
            );
          },
        },
      );
    },
    [transaction, categoryMutation],
  );

  if (!id) {
    return (
      <EmptyState
        title="Lançamento não encontrado"
        description="O link que você usou não é válido."
        actionLabel="Voltar para os lançamentos"
        onAction={() => router.replace("/(app)/(tabs)/transactions")}
      />
    );
  }

  if (isLoadingMe) {
    return (
      <View
        style={{ flex: 1, backgroundColor: tokens.bg.app, padding: space[5] }}
      >
        <Skeleton width="100%" height={28} borderRadius={6} />
        <View style={{ height: space[4] }} />
        <Skeleton width="100%" height={120} borderRadius={12} />
      </View>
    );
  }

  if (!transaction) {
    // Estado "not-found" (specs/mobile/routes/stack/transaction-detail.md §"Estados"):
    // não achamos o lançamento em nenhuma página cacheada — ver SUPOSIÇÃO em
    // transactionsCache.ts sobre a ausência de uma query singular por id.
    return (
      <EmptyState
        title="Não achamos esse lançamento"
        description="Ele pode não estar mais disponível ou seu cache local ainda não foi carregado. Volte para a lista e tente de novo."
        actionLabel="Voltar para os lançamentos"
        onAction={() => router.replace("/(app)/(tabs)/transactions")}
      />
    );
  }

  const hidden = optimisticHidden ?? transaction.hiddenFromFamily;
  const isOwner = Boolean(
    meData?.me?.id && transaction.owner?.id === meData.me.id,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        {transaction.description}
      </Text>

      <View style={{ marginTop: space[3] }}>
        <Amount value={transaction.amount} variant="large" colorByValue />
      </View>

      <View style={{ marginTop: space[6] }}>
        <Card padding="lg">
          <DetailRow
            label="Data"
            value={new Date(transaction.date).toLocaleDateString("pt-BR")}
          />
          <DetailRow label="Conta" value={transaction.account?.name ?? "—"} />
          <DetailRow label="Cartão" value={transaction.card?.name ?? "—"} />
          <DetailRow
            label="Categoria"
            value={transaction.category?.name ?? "Sem categoria"}
            isLast
          />
        </Card>
      </View>

      <View style={{ marginTop: space[6] }}>
        <Text style={[typeScale.h3, { color: tokens.text.primary }]}>
          Trocar categoria
        </Text>
        <View style={{ marginTop: space[3] }}>
          <Button
            label={transaction.category?.name ?? "Escolher categoria"}
            onPress={() => setCategoryPickerVisible(true)}
            loading={categoryMutation.isPending}
            variant="secondary"
            fullWidth
          />
          {categoryError ? (
            <Text
              style={[
                typeScale.caption,
                { color: tokens.state.error.fg, marginTop: space[2] },
              ]}
            >
              {categoryError}
            </Text>
          ) : null}
        </View>
      </View>

      <CategoryPickerSheet
        isVisible={isCategoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        familyId={familyId}
        selectedCategoryId={transaction.category?.id}
        onSelect={handleSelectCategory}
      />

      {isOwner ? (
        <View style={{ marginTop: space[8] }}>
          <Button
            label={hidden ? "Mostrar para a família" : "Ocultar da família"}
            onPress={handleToggleHide}
            loading={hideMutation.isPending}
            variant={hidden ? "secondary" : "destructive"}
            fullWidth
          />
          {hideError ? (
            <Text
              style={[
                typeScale.caption,
                { color: tokens.state.error.fg, marginTop: space[2] },
              ]}
            >
              {hideError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const tokens = useTokens();
  return (
    <View style={{ marginBottom: isLast ? 0 : space[4] }}>
      <Text style={[typeScale.label, { color: tokens.text.secondary }]}>
        {label}
      </Text>
      <Text
        style={[
          typeScale.body,
          { color: tokens.text.primary, marginTop: space[1] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
