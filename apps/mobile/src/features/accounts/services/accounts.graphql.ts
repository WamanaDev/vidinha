import { graphqlRequest } from "@lib/graphqlClient";
import type { OpenFinanceConnection } from "@app-types/graphql-generated";

// SUPOSIÇÃO: o SDL real (packages/graphql-schema/schema.graphql) NÃO expõe
// uma query dedicada `accounts(familyId: ID!): [Account!]!` como descrito em
// specs/mobile/routes/tabs/accounts.md — hoje `Account` só existe como campo
// aninhado em `OpenFinanceConnection.accounts`. A única forma real de listar
// contas é buscar `openFinanceConnections(familyId)` e achatar (`flatMap`)
// os `accounts` de cada conexão. Quando o backend adicionar uma query própria
// de contas, trocar aqui sem mudar a interface pública (`fetchAccounts`
// continua retornando a mesma forma achatada).
const OPEN_FINANCE_CONNECTIONS_QUERY = /* GraphQL */ `
  query OpenFinanceConnectionsForAccounts($familyId: ID!) {
    openFinanceConnections(familyId: $familyId) {
      id
      institutionName
      institutionLogoUrl
      status
      lastSyncedAt
      accounts {
        id
        type
        name
        maskedNumber
        currency
        balance
      }
    }
  }
`;

interface OpenFinanceConnectionsVariables {
  familyId: string;
}

interface OpenFinanceConnectionsResult {
  openFinanceConnections: OpenFinanceConnection[];
}

export function fetchOpenFinanceConnections(
  variables: OpenFinanceConnectionsVariables,
) {
  return graphqlRequest<
    OpenFinanceConnectionsResult,
    OpenFinanceConnectionsVariables
  >(OPEN_FINANCE_CONNECTIONS_QUERY, variables);
}
