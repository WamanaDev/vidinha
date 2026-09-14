export type {
  Account,
  AccountType,
  OpenFinanceConnection,
  ConnectionStatus,
} from "@app-types/graphql-generated";

// Conta "achatada" com o nome/logo da instituição de origem já embutidos —
// forma consumida pelas telas de Contas (lista e detalhe).
export interface AccountWithInstitution {
  id: string;
  type: import("@app-types/graphql-generated").AccountType;
  name: string;
  currency: string;
  balance: number;
  sharedWithFamily: boolean;
  fullDetailShared: boolean;
  institutionName: string;
  institutionLogoUrl?: string | null;
  connectionId: string | null;
  // SUPOSIÇÃO: o SDL real não expõe `Account.isManual` (só existe no Prisma —
  // apps/api/prisma/schema.prisma). Como `connection` é nulo exatamente
  // quando `isManual` é true (mesma regra do backend, `connectionId: String?`),
  // derivamos aqui em vez de pedir um campo que não existe no schema GraphQL.
  isManual: boolean;
}
