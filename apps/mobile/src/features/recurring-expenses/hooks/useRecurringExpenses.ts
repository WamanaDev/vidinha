import { useQuery } from "@tanstack/react-query";
import { fetchRecurringExpenses } from "@features/recurring-expenses/services/recurringExpenses.graphql";

/** Lista de despesas recorrentes da família — `recurringExpenses(familyId)`. */
export function useRecurringExpenses(familyId: string) {
  return useQuery({
    queryKey: ["recurringExpenses", familyId],
    queryFn: () => fetchRecurringExpenses({ familyId }),
    enabled: Boolean(familyId),
  });
}
