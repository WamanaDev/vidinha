import { graphqlRequest } from "@lib/graphqlClient";
import type {
  CreateTransactionInput,
  TransactionConnection,
  TransactionFilterInput,
  TransactionNode,
  TransactionOrderInput,
  UpdateTransactionInput,
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
          owner {
            id
            displayName
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

export interface TransactionsQueryResult {
  transactions: TransactionConnection;
}

export function fetchTransactions(variables: TransactionsQueryVariables) {
  return graphqlRequest<TransactionsQueryResult, TransactionsQueryVariables>(
    TRANSACTIONS_QUERY,
    variables,
  );
}

// apps/mobile/app/(app)/transaction/[id].tsx — ver specs/mobile/routes/stack/transaction-detail.md.
// Campos exatos de HideTransactionInput/UpdateTransactionCategoryInput e as
// mutations em si conforme o SDL real (packages/graphql-schema/schema.graphql).

const HIDE_TRANSACTION_MUTATION = /* GraphQL */ `
  mutation HideTransaction($input: HideTransactionInput!) {
    hideTransaction(input: $input) {
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
      owner {
        id
        displayName
      }
    }
  }
`;

export interface HideTransactionInput {
  transactionId: string;
  hiddenFromFamily: boolean;
}

interface HideTransactionResult {
  hideTransaction: TransactionNode;
}

export function hideTransaction(input: HideTransactionInput) {
  return graphqlRequest<HideTransactionResult, { input: HideTransactionInput }>(
    HIDE_TRANSACTION_MUTATION,
    { input },
  );
}

const UPDATE_TRANSACTION_CATEGORY_MUTATION = /* GraphQL */ `
  mutation UpdateTransactionCategory($input: UpdateTransactionCategoryInput!) {
    updateTransactionCategory(input: $input) {
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
      owner {
        id
        displayName
      }
    }
  }
`;

export interface UpdateTransactionCategoryInput {
  transactionId: string;
  categoryId: string;
}

interface UpdateTransactionCategoryResult {
  updateTransactionCategory: TransactionNode;
}

export function updateTransactionCategory(
  input: UpdateTransactionCategoryInput,
) {
  return graphqlRequest<
    UpdateTransactionCategoryResult,
    { input: UpdateTransactionCategoryInput }
  >(UPDATE_TRANSACTION_CATEGORY_MUTATION, { input });
}

// Mutations `createTransaction`/`updateTransaction`/`deleteTransaction` —
// SDL real (packages/graphql-schema/schema.graphql linhas 337-339, 457-479).
// CRUD manual de lançamentos (apps/mobile/app/(app)/transaction/new.tsx) e
// import de extrato via CSV.
const CREATE_TRANSACTION_MUTATION = /* GraphQL */ `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
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
      owner {
        id
        displayName
      }
    }
  }
`;

interface CreateTransactionResult {
  createTransaction: TransactionNode;
}

export function createTransaction(input: CreateTransactionInput) {
  return graphqlRequest<
    CreateTransactionResult,
    { input: CreateTransactionInput }
  >(CREATE_TRANSACTION_MUTATION, { input });
}

const UPDATE_TRANSACTION_MUTATION = /* GraphQL */ `
  mutation UpdateTransaction($input: UpdateTransactionInput!) {
    updateTransaction(input: $input) {
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
      owner {
        id
        displayName
      }
    }
  }
`;

interface UpdateTransactionResult {
  updateTransaction: TransactionNode;
}

export function updateTransaction(input: UpdateTransactionInput) {
  return graphqlRequest<
    UpdateTransactionResult,
    { input: UpdateTransactionInput }
  >(UPDATE_TRANSACTION_MUTATION, { input });
}

const DELETE_TRANSACTION_MUTATION = /* GraphQL */ `
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

interface DeleteTransactionResult {
  deleteTransaction: boolean;
}

export function deleteTransaction(id: string) {
  return graphqlRequest<DeleteTransactionResult, { id: string }>(
    DELETE_TRANSACTION_MUTATION,
    { id },
  );
}
