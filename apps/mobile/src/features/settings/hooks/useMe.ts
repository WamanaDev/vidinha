import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@features/settings/services/user.graphql";

/** Perfil do usuário logado — usada por `settings/profile` e `settings/security`. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
  });
}
