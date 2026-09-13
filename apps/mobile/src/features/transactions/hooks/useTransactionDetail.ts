import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { findTransactionInCache } from "@features/transactions/lib/transactionsCache";

/**
 * apps/mobile/app/(app)/transaction/[id].tsx — busca o lançamento no cache do
 * TanStack Query (ver SUPOSIÇÃO em transactionsCache.ts: não existe query
 * singular `transaction(id)` no SDL real). Retorna `undefined` quando não
 * encontrado em nenhuma página cacheada — a tela decide o estado "not-found".
 */
export function useTransactionDetail(transactionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    if (!transactionId) return undefined;
    return findTransactionInCache(queryClient, transactionId);
  }, [queryClient, transactionId]);
}
