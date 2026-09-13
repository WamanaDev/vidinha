import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from "@features/recurring-expenses/services/recurringExpenses.graphql";
import type {
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
} from "@features/recurring-expenses/types";

/** Criar despesa recorrente — `recurring-expenses/new`. */
export function useCreateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringExpenseInput) =>
      createRecurringExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recurringExpenses", familyId],
      });
    },
  });
}

/** Editar despesa recorrente — `recurring-expenses/[id]/edit`. */
export function useUpdateRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRecurringExpenseInput) =>
      updateRecurringExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recurringExpenses", familyId],
      });
    },
  });
}

/** Excluir despesa recorrente — `recurring-expenses/[id]/edit`. */
export function useDeleteRecurringExpense(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecurringExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recurringExpenses", familyId],
      });
    },
  });
}
