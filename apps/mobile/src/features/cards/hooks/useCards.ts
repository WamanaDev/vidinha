import { useQuery } from "@tanstack/react-query";
import { fetchCards } from "@features/cards/services/cards.graphql";

// Busca `cards(familyId)` (query real do SDL).
export function useCards(familyId: string) {
  return useQuery({
    queryKey: ["cards", familyId],
    queryFn: () => fetchCards({ familyId }),
    enabled: Boolean(familyId),
  });
}

/** Deriva um único cartão da lista já buscada — não há query singular
 * `card(id)` no SDL real (só a lista `cards(familyId)`). */
export function findCardById<T extends { id: string }>(
  cards: T[] | undefined,
  id: string | undefined,
): T | undefined {
  if (!id || !cards) return undefined;
  return cards.find((card) => card.id === id);
}
