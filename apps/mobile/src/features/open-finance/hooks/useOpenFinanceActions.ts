import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOpenFinanceConnection,
  revokeOpenFinanceConnection,
  syncOpenFinanceConnection,
} from "@features/open-finance/services/openFinance.graphql";
import type { CreateOpenFinanceConnectionInput } from "@features/open-finance/types";

/** Cria a conexão após o widget Pluggy Connect retornar um `itemId` — `open-finance/connect`. */
export function useCreateOpenFinanceConnection(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpenFinanceConnectionInput) =>
      createOpenFinanceConnection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId],
      });
      // A tela de Contas deriva a lista a partir de `openFinanceConnections`
      // (ver SUPOSIÇÃO em src/features/accounts/services/accounts.graphql.ts).
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId, "accounts"],
      });
    },
  });
}

/** Sincroniza uma conexão existente — `open-finance/connections`. */
export function useSyncOpenFinanceConnection(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      syncOpenFinanceConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId],
      });
    },
  });
}

/** Revoga (desconecta) uma conexão — `open-finance/connections`. */
export function useRevokeOpenFinanceConnection(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      revokeOpenFinanceConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId, "accounts"],
      });
    },
  });
}
