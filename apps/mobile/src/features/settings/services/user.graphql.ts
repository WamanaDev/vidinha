import { graphqlRequest } from "@lib/graphqlClient";
import type { User, DataExportPayload } from "@app-types/graphql-generated";

// Nomes de query/mutation e shapes conforme o SDL real de
// packages/graphql-schema/schema.graphql (fonte da verdade — specs/mobile/00-overview.md
// §"Fonte da verdade").

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      displayName
      avatarUrl
      mfaEnabled
      createdAt
    }
  }
`;

interface MeResult {
  me: User;
}

export function fetchMe() {
  return graphqlRequest<MeResult>(ME_QUERY);
}

const COMPLETE_USER_PROFILE_MUTATION = /* GraphQL */ `
  mutation CompleteUserProfile($input: CompleteProfileInput!) {
    completeUserProfile(input: $input) {
      id
      email
      displayName
      avatarUrl
      mfaEnabled
      createdAt
    }
  }
`;

interface CompleteProfileInput {
  displayName: string;
  avatarUrl?: string | null;
}

interface CompleteUserProfileResult {
  completeUserProfile: User;
}

export function completeUserProfile(input: CompleteProfileInput) {
  return graphqlRequest<
    CompleteUserProfileResult,
    { input: CompleteProfileInput }
  >(COMPLETE_USER_PROFILE_MUTATION, { input });
}

const EXPORT_MY_DATA_MUTATION = /* GraphQL */ `
  mutation ExportMyData {
    exportMyData {
      downloadUrl
      expiresAt
    }
  }
`;

interface ExportMyDataResult {
  exportMyData: DataExportPayload;
}

export function exportMyData() {
  return graphqlRequest<ExportMyDataResult>(EXPORT_MY_DATA_MUTATION);
}

const REQUEST_ACCOUNT_DELETION_MUTATION = /* GraphQL */ `
  mutation RequestAccountDeletion {
    requestAccountDeletion
  }
`;

interface RequestAccountDeletionResult {
  requestAccountDeletion: boolean;
}

export function requestAccountDeletion() {
  return graphqlRequest<RequestAccountDeletionResult>(
    REQUEST_ACCOUNT_DELETION_MUTATION,
  );
}
