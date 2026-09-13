import { useQuery } from "@tanstack/react-query";
import { fetchPluggyConnectToken } from "@features/open-finance/services/openFinance.graphql";

/** Gera o token do Pluggy Connect — consumido pela WebView do widget em `open-finance/connect`. */
export function usePluggyConnectToken() {
  return useQuery({
    queryKey: ["pluggyConnectToken"],
    queryFn: fetchPluggyConnectToken,
    // O token expira rápido (ver `PluggyConnectToken.expiresAt`) — não faz
    // sentido cachear entre montagens da tela de conexão.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
