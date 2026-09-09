import { useQuery } from "@tanstack/react-query";
import { fetchCards } from "@features/cards/services/cards.graphql";

/**
 * Sempre resolve para uma lista vazia hoje — ver SUPOSIÇÃO em
 * `services/cards.graphql.ts`: o backend real ainda não tem nenhum dado de
 * cartão. Mantido como hook (em vez de constante) para a tela já ficar
 * pronta para consumir dado real assim que o backend expuser a query.
 */
export function useCards(familyId: string) {
  return useQuery({
    queryKey: ["cards", familyId],
    queryFn: () => fetchCards({ familyId }),
    enabled: Boolean(familyId),
  });
}
