import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@features/categories/services/categories.graphql";

/** Lista de categorias da família — `categories(familyId)`. */
export function useCategories(familyId: string) {
  return useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => fetchCategories({ familyId }),
    enabled: Boolean(familyId),
  });
}
