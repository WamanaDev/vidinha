import type {
  ConnectionStatus,
  OpenFinanceItemResult,
} from "@features/open-finance/types";

/**
 * Deriva o "próximo passo" da UI a partir de um `OpenFinanceItemResult`
 * (retorno de `createOpenFinanceItem`/`sendOpenFinanceItemMfa`).
 *
 * O backend já reduz o par bruto `(item.status, item.executionStatus)` da
 * Pluggy para o enum fechado `ConnectionStatus` em `result.connection.status`
 * (ver `OpenFinanceService#mapPluggyStatus`) — usamos esse campo, já
 * confiável, como sinal principal de "terminou com sucesso" vs "erro
 * terminal", em vez de reimplementar o parsing das strings livres do Pluggy
 * no app. `mfaParameter`/`userAction` têm prioridade: mesmo que `status` já
 * pareça terminal, se a Pluggy ainda está pedindo mais uma informação, a UI
 * deve atender esse pedido primeiro.
 */
export type OpenFinanceItemNextStep =
  | { kind: "mfa" }
  | { kind: "qr" }
  | { kind: "success" }
  | { kind: "pending" }
  | { kind: "error"; message: string };

const TERMINAL_ERROR_STATUSES: ConnectionStatus[] = [
  "LOGIN_ERROR",
  "OUTDATED",
  "ERROR",
];

export function resolveOpenFinanceItemNextStep(
  result: OpenFinanceItemResult,
): OpenFinanceItemNextStep {
  if (result.mfaParameter) return { kind: "mfa" };
  if (result.userAction) return { kind: "qr" };

  if (result.connection.status === "CONNECTED") return { kind: "success" };

  if (TERMINAL_ERROR_STATUSES.includes(result.connection.status)) {
    return {
      kind: "error",
      message:
        result.errorMessage ??
        "Não deu pra conectar com essa instituição agora.",
    };
  }

  // `UPDATING` (ou qualquer outro valor não mapeado) — a sincronização segue
  // em segundo plano; a tela de conexões já mostra esse estado ("Atualizando...").
  return { kind: "pending" };
}
