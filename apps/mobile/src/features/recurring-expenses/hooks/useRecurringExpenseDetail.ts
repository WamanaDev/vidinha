import { useMemo } from "react";
import { useRecurringExpenses } from "@features/recurring-expenses/hooks/useRecurringExpenses";

/**
 * Deriva uma despesa recorrente específica a partir do cache de
 * `recurringExpenses(familyId)`. SUPOSIÇÃO: não há query singular por id no
 * SDL real — mesma abordagem usada em `useTransactionDetail`/`useCategoryDetail`.
 */
export function useRecurringExpenseDetail(
  familyId: string,
  id: string | undefined,
) {
  const query = useRecurringExpenses(familyId);

  const recurringExpense = useMemo(
    () => query.data?.recurringExpenses.find((r) => r.id === id) ?? null,
    [query.data, id],
  );

  return { ...query, recurringExpense };
}
