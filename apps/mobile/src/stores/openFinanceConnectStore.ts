import { create } from "zustand";
import type { ConnectorCredential } from "@features/open-finance/types";

// Estado efêmero de navegação para o fluxo nativo de conexão Open Finance
// (`open-finance/connect` -> `connect-form` -> `connect-mfa`), no mesmo
// padrão de `useOnboardingStore` (src/stores/onboardingStore.ts).
//
// IMPORTANTE (MASVS-STORAGE / LGPD): esta store NUNCA guarda valores de
// credenciais digitadas (usuário, senha, token de MFA) — só o `itemId`
// retornado pela API e o `parameter` (metadado do PRÓXIMO campo a pedir,
// como label/instructions/tipo, sem nenhum valor sensível). Os valores em si
// vivem só no estado local dos formulários (`useState`) e são descartados
// assim que a mutation é enviada. Não usar o middleware `persist` aqui.
interface OpenFinanceConnectState {
  connectorId: number | null;
  itemId: string | null;
  parameter: ConnectorCredential | null;
  setConnectorId: (connectorId: number) => void;
  setItem: (itemId: string, parameter: ConnectorCredential | null) => void;
  reset: () => void;
}

const initialState = {
  connectorId: null as number | null,
  itemId: null as string | null,
  parameter: null as ConnectorCredential | null,
};

export const useOpenFinanceConnectStore = create<OpenFinanceConnectState>(
  (set) => ({
    ...initialState,
    setConnectorId: (connectorId) => set({ connectorId }),
    setItem: (itemId, parameter) => set({ itemId, parameter }),
    reset: () => set(initialState),
  }),
);
