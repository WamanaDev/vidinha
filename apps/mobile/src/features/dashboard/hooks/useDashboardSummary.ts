import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccounts } from "@features/accounts/hooks/useAccounts";
import { useCards } from "@features/cards/hooks/useCards";
import { fetchTransactions } from "@features/transactions/services/transactions.graphql";
import { useActiveFamily } from "@lib/activeFamilyContext";
import type { TransactionEdge } from "@app-types/graphql-generated";

const RECENT_TRANSACTIONS_COUNT = 5;

/**
 * Compõe o resumo financeiro do Início: `accounts(familyId)`,
 * `cards(familyId)` e as `RECENT_TRANSACTIONS_COUNT` transações mais recentes
 * (`transactions(filter: {familyId}, first: 5)`, sem `orderBy` explícito —
 * o default do SDL já é `DATE DESC`, conforme
 * packages/graphql-schema/schema.graphql). As três queries já existem e
 * funcionam desde a Fase 0 de sync real do Open Finance.
 *
 * `recurringExpenses(familyId)` citada em specs/mobile/routes/tabs/home.md
 * não existe no SDL real — mantida fora do escopo desta v1, conforme
 * instrução explícita da tarefa (não inventar chamadas contra queries
 * inexistentes).
 */
export function useDashboardSummary() {
  const { familyId } = useActiveFamily();

  const accountsQuery = useAccounts(familyId);
  const cardsQuery = useCards(familyId);

  const transactionsQuery = useQuery({
    queryKey: ["dashboard-transactions", familyId],
    queryFn: () =>
      fetchTransactions({
        filter: { familyId },
        first: RECENT_TRANSACTIONS_COUNT,
      }),
    enabled: Boolean(familyId),
  });

  const recentTransactions: TransactionEdge[] = useMemo(
    () => transactionsQuery.data?.transactions.edges ?? [],
    [transactionsQuery.data],
  );

  const isLoading =
    accountsQuery.isLoading ||
    cardsQuery.isLoading ||
    transactionsQuery.isLoading;
  const isError =
    accountsQuery.isError || cardsQuery.isError || transactionsQuery.isError;
  const error =
    accountsQuery.error ?? cardsQuery.error ?? transactionsQuery.error;

  function refetch() {
    accountsQuery.refetch();
    cardsQuery.refetch();
    transactionsQuery.refetch();
  }

  return {
    accounts: accountsQuery.accounts,
    cards: cardsQuery.data?.cards ?? [],
    recentTransactions,
    isLoading,
    isError,
    error,
    refetch,
  };
}
