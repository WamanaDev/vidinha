import { graphqlRequest } from "@lib/graphqlClient";
import type {
  RecurringExpense,
  CreateRecurringExpenseInput,
  UpdateRecurringExpenseInput,
} from "@app-types/graphql-generated";

// apps/mobile/app/(app)/recurring-expenses/* — nomes exatos de
// packages/graphql-schema/schema.graphql (linhas 192-211, 223, 272-274, 339-360).

const RECURRING_EXPENSES_QUERY = /* GraphQL */ `
  query RecurringExpenses($familyId: ID!) {
    recurringExpenses(familyId: $familyId) {
      id
      description
      amount
      frequency
      nextDueDate
      sharedWithFamily
      category {
        id
        name
        icon
      }
      owner {
        id
        displayName
      }
    }
  }
`;

interface RecurringExpensesQueryVariables {
  familyId: string;
}

export interface RecurringExpensesQueryResult {
  recurringExpenses: RecurringExpense[];
}

export function fetchRecurringExpenses(
  variables: RecurringExpensesQueryVariables,
) {
  return graphqlRequest<
    RecurringExpensesQueryResult,
    RecurringExpensesQueryVariables
  >(RECURRING_EXPENSES_QUERY, variables);
}

const CREATE_RECURRING_EXPENSE_MUTATION = /* GraphQL */ `
  mutation CreateRecurringExpense($input: CreateRecurringExpenseInput!) {
    createRecurringExpense(input: $input) {
      id
      description
      amount
      frequency
      nextDueDate
      sharedWithFamily
      category {
        id
        name
        icon
      }
      owner {
        id
        displayName
      }
    }
  }
`;

interface CreateRecurringExpenseResult {
  createRecurringExpense: RecurringExpense;
}

export function createRecurringExpense(input: CreateRecurringExpenseInput) {
  return graphqlRequest<
    CreateRecurringExpenseResult,
    { input: CreateRecurringExpenseInput }
  >(CREATE_RECURRING_EXPENSE_MUTATION, { input });
}

const UPDATE_RECURRING_EXPENSE_MUTATION = /* GraphQL */ `
  mutation UpdateRecurringExpense($input: UpdateRecurringExpenseInput!) {
    updateRecurringExpense(input: $input) {
      id
      description
      amount
      frequency
      nextDueDate
      sharedWithFamily
      category {
        id
        name
        icon
      }
      owner {
        id
        displayName
      }
    }
  }
`;

interface UpdateRecurringExpenseResult {
  updateRecurringExpense: RecurringExpense;
}

export function updateRecurringExpense(input: UpdateRecurringExpenseInput) {
  return graphqlRequest<
    UpdateRecurringExpenseResult,
    { input: UpdateRecurringExpenseInput }
  >(UPDATE_RECURRING_EXPENSE_MUTATION, { input });
}

const DELETE_RECURRING_EXPENSE_MUTATION = /* GraphQL */ `
  mutation DeleteRecurringExpense($id: ID!) {
    deleteRecurringExpense(id: $id)
  }
`;

interface DeleteRecurringExpenseResult {
  deleteRecurringExpense: boolean;
}

export function deleteRecurringExpense(id: string) {
  return graphqlRequest<DeleteRecurringExpenseResult, { id: string }>(
    DELETE_RECURRING_EXPENSE_MUTATION,
    { id },
  );
}
