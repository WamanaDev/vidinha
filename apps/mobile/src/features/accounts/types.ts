export type {
  Account,
  AccountType,
  OpenFinanceConnection,
  ConnectionStatus,
} from "@app-types/graphql-generated";

// Conta "achatada" com o nome/logo da instituição de origem já embutidos —
// forma consumida pela tela de Contas (ver SUPOSIÇÃO em services/accounts.graphql.ts).
export interface AccountWithInstitution {
  id: string;
  type: import("@app-types/graphql-generated").AccountType;
  name: string;
  maskedNumber?: string | null;
  currency: string;
  balance: number;
  institutionName: string;
  institutionLogoUrl?: string | null;
  connectionId: string;
}
