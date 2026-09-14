import { useQuery } from "@tanstack/react-query";
import { fetchOpenFinanceConnectionsList } from "@features/open-finance/services/openFinance.graphql";
import type { OpenFinanceConnection } from "@features/open-finance/types";

/** Lista as conexões Open Finance da família ativa — `open-finance/connections`. */
export function useOpenFinanceConnections(familyId: string) {
  return useQuery({
    queryKey: ["openFinanceConnections", familyId],
    queryFn: () => fetchOpenFinanceConnectionsList({ familyId }),
    enabled: Boolean(familyId),
    // A Pluggy sincroniza em segundo plano depois que o item é criado — a
    // conexão nasce com status "UPDATING" e só muda para "CONNECTED" (ou um
    // erro) quando essa sincronização termina, normalmente em poucos
    // segundos. Sem revalidar sozinho, a tela ficava presa mostrando
    // "Atualizando" pra sempre até o usuário sair e voltar manualmente.
    refetchInterval: (query) => {
      const connections =
        (
          query.state.data as
            { openFinanceConnections: OpenFinanceConnection[] } | undefined
        )?.openFinanceConnections ?? [];
      const hasPending = connections.some((c) => c.status === "UPDATING");
      return hasPending ? 3000 : false;
    },
  });
}
