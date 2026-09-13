import { graphqlRequest } from "@lib/graphqlClient";
import type { Account } from "@app-types/graphql-generated";

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
