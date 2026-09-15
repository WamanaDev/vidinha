import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOpenFinanceItem,
  revokeOpenFinanceConnection,
  sendOpenFinanceItemMfa,
  syncOpenFinanceConnection,
} from "@features/open-finance/services/openFinance.graphql";
import type {
  CreateOpenFinanceItemInput,
  SendOpenFinanceItemMfaInput,
} from "@features/open-finance/types";

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
      // Um sync bem-sucedido pode ter criado/atualizado contas e cartões
      // (ver OpenFinanceService#syncAccountsAndTransactions) — sem isso, a
      // tela de Contas/Cartões só refletia o resultado depois de sair e
      // voltar (bug relatado em teste em dispositivo real).
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

/**
 * Cria o item Open Finance a partir do conector escolhido e das credenciais
 * digitadas no formulário nativo — `open-finance/connect-form`.
 *
 * As credenciais em si nunca passam por cache do TanStack Query nem por
 * nenhum estado persistido: `input.parameters` é usado só como payload da
 * mutation (MASVS-STORAGE — ver comentário de segurança em connect-form.tsx).
 */
export function useCreateOpenFinanceItem(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpenFinanceItemInput) =>
      createOpenFinanceItem(input),
    onSuccess: () => {
      // A conexão já é persistida pelo backend mesmo quando o item ainda não
      // terminou (ex.: aguardando MFA) — invalida sempre, a tela de conexões
      // mostra o status real (`CONNECTED`/`UPDATING`/`LOGIN_ERROR`/etc.).
      queryClient.invalidateQueries({
        queryKey: ["openFinanceConnections", familyId],
      });
    },
  });
}

/** Envia o(s) valor(es) de MFA pedido(s) pela instituição — `open-finance/connect-mfa`. */
export function useSendOpenFinanceItemMfa(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendOpenFinanceItemMfaInput) =>
      sendOpenFinanceItemMfa(input),
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
