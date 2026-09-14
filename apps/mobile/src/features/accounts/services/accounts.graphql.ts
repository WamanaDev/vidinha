import { graphqlRequest } from "@lib/graphqlClient";
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "@app-types/graphql-generated";

// Query `accounts(familyId: ID!): [Account!]!` — SDL real,
// packages/graphql-schema/schema.graphql. (Uma versão anterior deste arquivo
// assumia que essa query não existia e achatava `openFinanceConnections`;
// o SDL implementado já expõe `accounts` diretamente, com
// `sharedWithFamily`/`fullDetailShared` necessários para a tela de detalhe.)
const ACCOUNTS_QUERY = /* GraphQL */ `
  query AccountsForFamily($familyId: ID!) {
    accounts(familyId: $familyId) {
      id
      name
      type
      balance
      currency
      sharedWithFamily
      fullDetailShared
      owner {
        id
      }
      connection {
        id
        institutionName
        institutionLogoUrl
      }
    }
  }
`;

interface AccountsVariables {
  familyId: string;
}

interface AccountsResult {
  accounts: Account[];
}

export function fetchAccounts(variables: AccountsVariables) {
  return graphqlRequest<AccountsResult, AccountsVariables>(
    ACCOUNTS_QUERY,
    variables,
  );
}

// Mutations `createAccount`/`updateAccount`/`archiveAccount` — SDL real
// (packages/graphql-schema/schema.graphql linhas 328-330, 404-419). CRUD
// manual de contas (apps/mobile/app/(app)/accounts/new.tsx).
const CREATE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation CreateAccount($input: CreateAccountInput!) {
    createAccount(input: $input) {
      id
      name
      type
      balance
      currency
      sharedWithFamily
      fullDetailShared
      owner {
        id
      }
      connection {
        id
        institutionName
        institutionLogoUrl
      }
    }
  }
`;

interface CreateAccountResult {
  createAccount: Account;
}

export function createAccount(input: CreateAccountInput) {
  return graphqlRequest<CreateAccountResult, { input: CreateAccountInput }>(
    CREATE_ACCOUNT_MUTATION,
    { input },
  );
}

const UPDATE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation UpdateAccount($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
      id
      name
      type
      balance
      currency
      sharedWithFamily
      fullDetailShared
      owner {
        id
      }
      connection {
        id
        institutionName
        institutionLogoUrl
      }
    }
  }
`;

interface UpdateAccountResult {
  updateAccount: Account;
}

export function updateAccount(input: UpdateAccountInput) {
  return graphqlRequest<UpdateAccountResult, { input: UpdateAccountInput }>(
    UPDATE_ACCOUNT_MUTATION,
    { input },
  );
}

const ARCHIVE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation ArchiveAccount($id: ID!) {
    archiveAccount(id: $id)
  }
`;

interface ArchiveAccountResult {
  archiveAccount: boolean;
}

export function archiveAccount(id: string) {
  return graphqlRequest<ArchiveAccountResult, { id: string }>(
    ARCHIVE_ACCOUNT_MUTATION,
    { id },
  );
}
