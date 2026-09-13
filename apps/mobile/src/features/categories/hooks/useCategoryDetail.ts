import { useMemo } from "react";
import { useCategories } from "@features/categories/hooks/useCategories";

/**
 * Deriva uma categoria específica a partir do cache de `categories(familyId)`.
 * SUPOSIÇÃO: não há query singular `category(id)` no SDL real — mesma
 * abordagem usada em `useTransactionDetail` (derivar do cache de lista).
 */
export function useCategoryDetail(familyId: string, id: string | undefined) {
  const query = useCategories(familyId);

  const category = useMemo(
    () => query.data?.categories.find((c) => c.id === id) ?? null,
    [query.data, id],
  );

  return { ...query, category };
}
