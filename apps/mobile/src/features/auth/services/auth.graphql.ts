import { graphqlRequest } from "@lib/graphqlClient";

const COMPLETE_USER_PROFILE_MUTATION = /* GraphQL */ `
  mutation CompleteUserProfile($input: CompleteProfileInput!) {
    completeUserProfile(input: $input) {
      id
      email
      displayName
      avatarUrl
    }
  }
`;

interface CompleteProfileInput {
  displayName: string;
  avatarUrl?: string;
}

interface CompleteUserProfileResult {
  completeUserProfile: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

/** Primeiro login após cadastro — `(auth)/sign-up`. */
export function completeUserProfile(input: CompleteProfileInput) {
  return graphqlRequest<
    CompleteUserProfileResult,
    { input: CompleteProfileInput }
  >(COMPLETE_USER_PROFILE_MUTATION, { input });
}
