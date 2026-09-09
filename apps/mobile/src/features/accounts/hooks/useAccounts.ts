import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOpenFinanceConnections } from "@features/accounts/services/accounts.graphql";
import type { AccountWithInstitution } from "@features/accounts/types";

/**
 * Deriva a lista de contas a partir de `openFinanceConnections(familyId)`
 * (ver SUPOSIÇÃO em `services/accounts.graphql.ts` — não há query própria de
 * contas no SDL real ainda).
 */
export function useAccounts(familyId: string) {
  const query = useQuery({
    queryKey: ["openFinanceConnections", familyId, "accounts"],
    queryFn: () => fetchOpenFinanceConnections({ familyId }),
    enabled: Boolean(familyId),
  });

  const accounts = useMemo<AccountWithInstitution[]>(
    () =>
      (query.data?.openFinanceConnections ?? []).flatMap((connection) =>
        connection.accounts.map((account) => ({
          ...account,
          institutionName: connection.institutionName,
          institutionLogoUrl: connection.institutionLogoUrl,
          connectionId: connection.id,
        })),
      ),
    [query.data],
  );

  return { ...query, accounts };
}
