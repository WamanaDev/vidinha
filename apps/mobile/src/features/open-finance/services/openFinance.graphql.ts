import { graphqlRequest } from "@lib/graphqlClient";
import type {
  CreateOpenFinanceConnectionInput,
  OpenFinanceConnection,
  PluggyConnectToken,
} from "@features/open-finance/types";

// Nomes de query/mutation conforme o SDL real de
// packages/graphql-schema/schema.graphql — specs/mobile/routes/stack/connect-open-finance.md.

const PLUGGY_CONNECT_TOKEN_QUERY = /* GraphQL */ `
  query PluggyConnectTokenQuery {
    pluggyConnectToken {
      connectToken
      expiresAt
    }
  }
`;

interface PluggyConnectTokenResult {
  pluggyConnectToken: PluggyConnectToken;
}

export function fetchPluggyConnectToken() {
  return graphqlRequest<PluggyConnectTokenResult>(PLUGGY_CONNECT_TOKEN_QUERY);
}

const OPEN_FINANCE_CONNECTIONS_QUERY = /* GraphQL */ `
  query OpenFinanceConnections($familyId: ID!) {
    openFinanceConnections(familyId: $familyId) {
      id
      institutionName
      institutionLogoUrl
      status
      lastSyncedAt
      createdAt
      accounts {
        id
        name
        type
        balance
        currency
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

export function fetchOpenFinanceConnectionsList(
  variables: OpenFinanceConnectionsVariables,
) {
  return graphqlRequest<
    OpenFinanceConnectionsResult,
    OpenFinanceConnectionsVariables
  >(OPEN_FINANCE_CONNECTIONS_QUERY, variables);
}

const CREATE_OPEN_FINANCE_CONNECTION_MUTATION = /* GraphQL */ `
  mutation CreateOpenFinanceConnection(
    $input: CreateOpenFinanceConnectionInput!
  ) {
    createOpenFinanceConnection(input: $input) {
      id
      institutionName
      status
    }
  }
`;

interface CreateOpenFinanceConnectionResult {
  createOpenFinanceConnection: OpenFinanceConnection;
}

export function createOpenFinanceConnection(
  input: CreateOpenFinanceConnectionInput,
) {
  return graphqlRequest<
    CreateOpenFinanceConnectionResult,
    { input: CreateOpenFinanceConnectionInput }
  >(CREATE_OPEN_FINANCE_CONNECTION_MUTATION, { input });
}

const SYNC_OPEN_FINANCE_CONNECTION_MUTATION = /* GraphQL */ `
  mutation SyncOpenFinanceConnection($connectionId: ID!) {
    syncOpenFinanceConnection(connectionId: $connectionId) {
      id
      status
      lastSyncedAt
    }
  }
`;

interface SyncOpenFinanceConnectionResult {
  syncOpenFinanceConnection: OpenFinanceConnection;
}

export function syncOpenFinanceConnection(connectionId: string) {
  return graphqlRequest<
    SyncOpenFinanceConnectionResult,
    { connectionId: string }
  >(SYNC_OPEN_FINANCE_CONNECTION_MUTATION, { connectionId });
}

const REVOKE_OPEN_FINANCE_CONNECTION_MUTATION = /* GraphQL */ `
  mutation RevokeOpenFinanceConnection($connectionId: ID!) {
    revokeOpenFinanceConnection(connectionId: $connectionId)
  }
`;

interface RevokeOpenFinanceConnectionResult {
  revokeOpenFinanceConnection: boolean;
}

export function revokeOpenFinanceConnection(connectionId: string) {
  return graphqlRequest<
    RevokeOpenFinanceConnectionResult,
    { connectionId: string }
  >(REVOKE_OPEN_FINANCE_CONNECTION_MUTATION, { connectionId });
}
