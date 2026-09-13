import { useQuery } from "@tanstack/react-query";
import {
  fetchFamily,
  fetchMyFamilies,
} from "@features/family/services/family.graphql";

/** Detalhe completo de uma família (membros, myRole) — tela `(tabs)/family`. */
export function useFamily(familyId: string) {
  return useQuery({
    queryKey: ["family", familyId],
    queryFn: () => fetchFamily({ id: familyId }),
    enabled: Boolean(familyId),
  });
}

/**
 * Lista de vínculos (FamilyMembership) do usuário logado — usada tanto pelo
 * `ActiveFamilyProvider` (`@lib/activeFamilyContext`) quanto pela tela de
 * Início para exibir nome/famílias do usuário.
 */
export function useMyFamilies() {
  return useQuery({
    queryKey: ["myFamilies"],
    queryFn: () => fetchMyFamilies(),
  });
}
