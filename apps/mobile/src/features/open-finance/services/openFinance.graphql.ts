import { graphqlRequest } from "@lib/graphqlClient";
import type {
  CreateOpenFinanceItemInput,
  OpenFinanceConnection,
  OpenFinanceConnector,
  OpenFinanceItemResult,
  SendOpenFinanceItemMfaInput,
} from "@features/open-finance/types";

// Nomes de query/mutation conforme o SDL real de
// packages/graphql-schema/schema.graphql (linhas ~118-183, 280-332) —
// specs/mobile/routes/stack/connect-open-finance.md ainda descreve o fluxo
// antigo (widget web `pluggyConnectToken` + `createOpenFinanceConnection`),
// que o produto eliminou: a conexão bancária agora é feita com telas nativas
// chamando `openFinanceConnectors` / `createOpenFinanceItem` /
// `sendOpenFinanceItemMfa` diretamente (ver
// `apps/mobile/app/(app)/open-finance/connect*.tsx`). `pluggyConnectToken` e
// `createOpenFinanceConnection` não existem mais no SDL real — removidos
// deste arquivo.

const OPEN_FINANCE_CONNECTORS_QUERY = /* GraphQL */ `
  query OpenFinanceConnectors($includeSandbox: Boolean) {
    openFinanceConnectors(includeSandbox: $includeSandbox) {
      id
      name
      imageUrl
      primaryColor
      type
      country
      hasMFA
      oauth
      oauthUrl
      health {
        status
      }
      credentials {
        name
        label
        type
        placeholder
        validation
        validationMessage
        optional
        instructions
        options {
          value
          label
        }
      }
    }
  }
`;

interface OpenFinanceConnectorsVariables {
  includeSandbox?: boolean;
}

interface OpenFinanceConnectorsResult {
  openFinanceConnectors: OpenFinanceConnector[];
}

export function fetchOpenFinanceConnectors(
  variables?: OpenFinanceConnectorsVariables,
) {
  return graphqlRequest<
    OpenFinanceConnectorsResult,
    OpenFinanceConnectorsVariables
  >(OPEN_FINANCE_CONNECTORS_QUERY, variables ?? {});
}

const OPEN_FINANCE_ITEM_RESULT_FIELDS = /* GraphQL */ `
  pluggyItemId
  connection {
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
  status
  executionStatus
  mfaParameter {
    name
    label
    type
    placeholder
    validation
    validationMessage
    optional
    instructions
    options {
      value
      label
    }
  }
  userAction {
    type
    instructions
    expiresAt
  }
  errorMessage
`;

const CREATE_OPEN_FINANCE_ITEM_MUTATION = /* GraphQL */ `
  mutation CreateOpenFinanceItem($input: CreateOpenFinanceItemInput!) {
    createOpenFinanceItem(input: $input) {
      ${OPEN_FINANCE_ITEM_RESULT_FIELDS}
    }
  }
`;

interface CreateOpenFinanceItemResult {
  createOpenFinanceItem: OpenFinanceItemResult;
}

/** Inicia a conexão com uma instituição a partir das credenciais do formulário nativo — `open-finance/connect-form`. */
export function createOpenFinanceItem(input: CreateOpenFinanceItemInput) {
  return graphqlRequest<
    CreateOpenFinanceItemResult,
    { input: CreateOpenFinanceItemInput }
  >(CREATE_OPEN_FINANCE_ITEM_MUTATION, { input });
}

const SEND_OPEN_FINANCE_ITEM_MFA_MUTATION = /* GraphQL */ `
  mutation SendOpenFinanceItemMfa($input: SendOpenFinanceItemMfaInput!) {
    sendOpenFinanceItemMfa(input: $input) {
      ${OPEN_FINANCE_ITEM_RESULT_FIELDS}
    }
  }
`;

interface SendOpenFinanceItemMfaResult {
  sendOpenFinanceItemMfa: OpenFinanceItemResult;
}

/** Envia o(s) valor(es) de MFA pedido(s) pela instituição — `open-finance/connect-mfa`. */
export function sendOpenFinanceItemMfa(input: SendOpenFinanceItemMfaInput) {
  return graphqlRequest<
    SendOpenFinanceItemMfaResult,
    { input: SendOpenFinanceItemMfaInput }
  >(SEND_OPEN_FINANCE_ITEM_MFA_MUTATION, { input });
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
