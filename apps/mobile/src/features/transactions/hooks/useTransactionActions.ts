import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@features/transactions/services/transactions.graphql";
import { patchTransactionInCache } from "@features/transactions/lib/transactionsCache";
import type {
  CreateTransactionInput,
  TransactionNode,
  UpdateTransactionInput,
} from "@app-types/graphql-generated";

// Mesmo padrão de `useRecurringExpenseActions.ts`/`useHideTransaction.ts` —
// `useMutation` + invalidação/patch das queries `["transactions", ...]`
// (paginadas via `useInfiniteQuery` em `(tabs)/transactions.tsx`).

/** Criar lançamento manual — `transaction/new` e import de CSV. */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () => {
      // Uma nova página/ordenação pode ser afetada de formas difíceis de
      // prever numa lista cursor-based — invalida tudo em vez de tentar
      // inserir a página otimisticamente (mesma decisão simples adotada em
      // `useCreateRecurringExpense`).
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

/** Editar lançamento manual — `transaction/[id]`. */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => updateTransaction(input),
    onSuccess: ({
      updateTransaction: updated,
    }: {
      updateTransaction: TransactionNode;
    }) => {
      patchTransactionInCache(queryClient, updated.id, updated);
    },
  });
}

/** Excluir lançamento manual — ação destrutiva, sempre com confirmação
 * (`Alert.alert`) antes de chamar `mutate`. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}
