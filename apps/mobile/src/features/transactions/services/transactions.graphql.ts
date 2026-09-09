import { graphqlRequest } from "@lib/graphqlClient";
import type {
  TransactionConnection,
  TransactionFilterInput,
  TransactionOrderInput,
} from "@app-types/graphql-generated";

const TRANSACTIONS_QUERY = /* GraphQL */ `
  query Transactions(
    $filter: TransactionFilterInput!
    $orderBy: TransactionOrderInput
    $first: Int
    $after: Cursor
  ) {
    transactions(
      filter: $filter
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
      edges {
        cursor
        node {
          id
          description
          amount
          date
          hiddenFromFamily
          category {
            id
            name
            icon
          }
          account {
            id
            name
          }
          card {
            id
            name
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

interface TransactionsQueryVariables {
  filter: TransactionFilterInput;
  orderBy?: TransactionOrderInput;
  first?: number;
  after?: string;
}

interface TransactionsQueryResult {
  transactions: TransactionConnection;
}

export function fetchTransactions(variables: TransactionsQueryVariables) {
  return graphqlRequest<TransactionsQueryResult, TransactionsQueryVariables>(
    TRANSACTIONS_QUERY,
    variables,
  );
}
