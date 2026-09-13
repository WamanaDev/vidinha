import { graphqlRequest } from "@lib/graphqlClient";
import type { Card } from "@app-types/graphql-generated";

// Query `cards(familyId: ID!): [Card!]!` — SDL real,
// packages/graphql-schema/schema.graphql.
const CARDS_QUERY = /* GraphQL */ `
  query CardsForFamily($familyId: ID!) {
    cards(familyId: $familyId) {
      id
      name
      lastFourDigits
      limit
      currentInvoice
      dueDate
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
