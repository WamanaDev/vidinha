import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hideTransaction } from "@features/transactions/services/transactions.graphql";
import { patchTransactionInCache } from "@features/transactions/lib/transactionsCache";
import type { TransactionNode } from "@app-types/graphql-generated";

/**
 * apps/mobile/app/(app)/transaction/[id].tsx — toggle "ocultar da família"
 * (specs/mobile/routes/stack/transaction-detail.md). Atualização otimista:
 * quem chama já decide o valor local antes de disparar a mutation; aqui
 * cuidamos só da chamada e de propagar o resultado (ou reverter) no cache
 * compartilhado com a lista de transações.
 */
export function useHideTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { transactionId: string; hiddenFromFamily: boolean }) =>
      hideTransaction(input),
    onSuccess: ({
      hideTransaction: updated,
    }: {
      hideTransaction: TransactionNode;
    }) => {
      patchTransactionInCache(queryClient, updated.id, updated);
    },
  });
}
