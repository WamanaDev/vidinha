import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "@features/accounts/services/accounts.graphql";
import type { AccountWithInstitution } from "@features/accounts/types";

/**
 * Busca `accounts(familyId)` (query real do SDL) e achata o nome/logo da
 * instituição a partir de `connection` para o formato consumido pelas telas
 * de Contas.
 */
export function useAccounts(familyId: string) {
  const query = useQuery({
    queryKey: ["accounts", familyId],
    queryFn: () => fetchAccounts({ familyId }),
    enabled: Boolean(familyId),
  });

  const accounts = useMemo<AccountWithInstitution[]>(
    () =>
      (query.data?.accounts ?? []).map((account) => ({
        ...account,
        institutionName: account.connection?.institutionName ?? "Conta manual",
        institutionLogoUrl: account.connection?.institutionLogoUrl ?? null,
        connectionId: account.connection?.id ?? null,
        isManual: !account.connection,
      })),
    [query.data],
  );

  return { ...query, accounts };
}

/** Deriva uma única conta da lista já buscada — não há query singular
 * `account(id)` no SDL real (só a lista `accounts(familyId)`). */
export function findAccountById(
  accounts: AccountWithInstitution[],
  id: string | undefined,
): AccountWithInstitution | undefined {
  if (!id) return undefined;
  return accounts.find((account) => account.id === id);
}
