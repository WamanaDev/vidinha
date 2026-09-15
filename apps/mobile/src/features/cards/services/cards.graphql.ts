import { graphqlRequest } from "@lib/graphqlClient";
import type {
  Card,
  CreateCardInput,
  UpdateCardInput,
} from "@app-types/graphql-generated";

// Query `cards(familyId: ID!): [Card!]!` — SDL real,
// packages/graphql-schema/schema.graphql. `type`/`brand` adicionados aqui
// para os formulários de cadastro/edição manual (accounts/cards CRUD).
const CARDS_QUERY = /* GraphQL */ `
  query CardsForFamily($familyId: ID!) {
    cards(familyId: $familyId) {
      id
      name
      type
      brand
      lastFourDigits
      limit
      currentInvoice
      dueDate
      connection {
        id
        institutionName
      }
      sharedWithFamily
      owner {
        id
      }
    }
  }
`;

interface CardsVariables {
  familyId: string;
}

interface CardsResult {
  cards: Card[];
}

export function fetchCards(variables: CardsVariables) {
  return graphqlRequest<CardsResult, CardsVariables>(CARDS_QUERY, variables);
}

// Mutations `createCard`/`updateCard`/`archiveCard` — SDL real
// (packages/graphql-schema/schema.graphql linhas 332-334, 426-445). CRUD
// manual de cartões (apps/mobile/app/(app)/cards/new.tsx).
const CREATE_CARD_MUTATION = /* GraphQL */ `
  mutation CreateCard($input: CreateCardInput!) {
    createCard(input: $input) {
      id
      name
      type
      brand
      lastFourDigits
      limit
      currentInvoice
      dueDate
      connection {
        id
        institutionName
      }
      sharedWithFamily
      owner {
        id
      }
    }
  }
`;

interface CreateCardResult {
  createCard: Card;
}

export function createCard(input: CreateCardInput) {
  return graphqlRequest<CreateCardResult, { input: CreateCardInput }>(
    CREATE_CARD_MUTATION,
    { input },
  );
}

const UPDATE_CARD_MUTATION = /* GraphQL */ `
  mutation UpdateCard($input: UpdateCardInput!) {
    updateCard(input: $input) {
      id
      name
      type
      brand
      lastFourDigits
      limit
      currentInvoice
      dueDate
      connection {
        id
        institutionName
      }
      sharedWithFamily
      owner {
        id
      }
    }
  }
`;

interface UpdateCardResult {
  updateCard: Card;
}

export function updateCard(input: UpdateCardInput) {
  return graphqlRequest<UpdateCardResult, { input: UpdateCardInput }>(
    UPDATE_CARD_MUTATION,
    { input },
  );
}

const ARCHIVE_CARD_MUTATION = /* GraphQL */ `
  mutation ArchiveCard($id: ID!) {
    archiveCard(id: $id)
  }
`;

interface ArchiveCardResult {
  archiveCard: boolean;
}

export function archiveCard(id: string) {
  return graphqlRequest<ArchiveCardResult, { id: string }>(
    ARCHIVE_CARD_MUTATION,
    { id },
  );
}
