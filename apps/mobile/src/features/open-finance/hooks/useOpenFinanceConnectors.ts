import { useQuery } from "@tanstack/react-query";
import { fetchOpenFinanceConnectors } from "@features/open-finance/services/openFinance.graphql";

/**
 * Lista os conectores (instituições) disponíveis na Pluggy — tela inicial
 * do fluxo nativo de conexão, `open-finance/connect`. A lista completa fica
 * em cache do TanStack Query (`queryKey: ["openFinanceConnectors"]`) e é
 * reaproveitada pela tela de formulário (`connect-form`) para achar os dados
 * do conector escolhido sem uma nova rede/roundtrip.
 */
export function useOpenFinanceConnectors() {
  return useQuery({
    queryKey: ["openFinanceConnectors"],
    // TODO: `includeSandbox: true` é temporário enquanto a conta Pluggy do
    // projeto estiver no plano trial — nesse plano, criar item para QUALQUER
    // banco real (`isSandbox: false`) falha com
    // `TRIAL_CLIENT_ITEM_CREATE_NOT_ALLOWED`, e só os conectores de sandbox
    // (ex.: "Pluggy Bank", credenciais `user-ok`/`password-ok`) funcionam de
    // fato. Sem isso, a lista padrão mostra só os ~230 bancos reais que
    // sempre falham e esconde o único que funciona. Trocar para `false` (ou
    // remover o parâmetro) quando o plano Pluggy virar produção.
    queryFn: () => fetchOpenFinanceConnectors({ includeSandbox: true }),
    // A lista de instituições muda raramente — evita refetch a cada troca de tela.
    staleTime: 5 * 60 * 1000,
  });
}
