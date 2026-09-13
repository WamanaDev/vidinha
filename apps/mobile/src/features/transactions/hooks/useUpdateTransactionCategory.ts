import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTransactionCategory } from "@features/transactions/services/transactions.graphql";
import { patchTransactionInCache } from "@features/transactions/lib/transactionsCache";
import type { TransactionNode } from "@app-types/graphql-generated";

/**
 * apps/mobile/app/(app)/transaction/[id].tsx — troca de categoria
 * (specs/mobile/routes/stack/transaction-detail.md). Propaga o resultado da
 * mutation (categoria já resolvida pelo backend) para o cache compartilhado
 * com a lista de transações.
 */
export function useUpdateTransactionCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { transactionId: string; categoryId: string }) =>
      updateTransactionCategory(input),
    onSuccess: ({
      updateTransactionCategory: updated,
    }: {
      updateTransactionCategory: TransactionNode;
    }) => {
      patchTransactionInCache(queryClient, updated.id, updated);
    },
  });
}
