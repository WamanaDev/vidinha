import { graphqlRequest } from "@lib/graphqlClient";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@app-types/graphql-generated";

// apps/mobile/app/(app)/categories/* e o seletor de categoria em
// apps/mobile/app/(app)/transaction/[id].tsx — nomes exatos de
// packages/graphql-schema/schema.graphql (linhas 151-157, 224, 275-277, 362-373).

const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories($familyId: ID!) {
    categories(familyId: $familyId) {
      id
      name
      icon
      hiddenFromFamily
      isDefault
    }
  }
`;

interface CategoriesQueryVariables {
  familyId: string;
}

export interface CategoriesQueryResult {
  categories: Category[];
}

export function fetchCategories(variables: CategoriesQueryVariables) {
  return graphqlRequest<CategoriesQueryResult, CategoriesQueryVariables>(
    CATEGORIES_QUERY,
    variables,
  );
}

const CREATE_CATEGORY_MUTATION = /* GraphQL */ `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      icon
      hiddenFromFamily
      isDefault
    }
  }
`;

interface CreateCategoryResult {
  createCategory: Category;
}

export function createCategory(input: CreateCategoryInput) {
  return graphqlRequest<CreateCategoryResult, { input: CreateCategoryInput }>(
    CREATE_CATEGORY_MUTATION,
    { input },
  );
}

const UPDATE_CATEGORY_MUTATION = /* GraphQL */ `
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      id
      name
      icon
      hiddenFromFamily
      isDefault
    }
  }
`;

interface UpdateCategoryResult {
  updateCategory: Category;
}

export function updateCategory(input: UpdateCategoryInput) {
  return graphqlRequest<UpdateCategoryResult, { input: UpdateCategoryInput }>(
    UPDATE_CATEGORY_MUTATION,
    { input },
  );
}

const DELETE_CATEGORY_MUTATION = /* GraphQL */ `
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

interface DeleteCategoryResult {
  deleteCategory: boolean;
}

export function deleteCategory(id: string) {
  return graphqlRequest<DeleteCategoryResult, { id: string }>(
    DELETE_CATEGORY_MUTATION,
    { id },
  );
}
