import { useQuery } from "@tanstack/react-query";
import { fetchOpenFinanceConnectionsList } from "@features/open-finance/services/openFinance.graphql";

/** Lista as conexões Open Finance da família ativa — `open-finance/connections`. */
export function useOpenFinanceConnections(familyId: string) {
  return useQuery({
    queryKey: ["openFinanceConnections", familyId],
    queryFn: () => fetchOpenFinanceConnectionsList({ familyId }),
    enabled: Boolean(familyId),
  });
}
