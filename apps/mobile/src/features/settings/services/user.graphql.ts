import { graphqlRequest } from "@lib/graphqlClient";
import type {
  User,
  DataExportPayload,
  CompleteProfileInput,
  AvatarUploadUrlPayload,
} from "@app-types/graphql-generated";

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

interface CompleteUserProfileResult {
  completeUserProfile: User;
}

export function completeUserProfile(input: CompleteProfileInput) {
  return graphqlRequest<
    CompleteUserProfileResult,
    { input: CompleteProfileInput }
  >(COMPLETE_USER_PROFILE_MUTATION, { input });
}

// specs/security/file-uploads.md §2 (passo 1) — `mimeType` deve ser um dos
// permitidos pelo bucket (`image/jpeg`, `image/png`, `image/webp`),
// revalidado no client antes de chamar (ver `avatarUpload.ts`) só para não
// desperdiçar uma signed URL, mas a allowlist real é sempre a do backend.
const CREATE_AVATAR_UPLOAD_URL_MUTATION = /* GraphQL */ `
  mutation CreateAvatarUploadUrl($mimeType: String!) {
    createAvatarUploadUrl(mimeType: $mimeType) {
      uploadUrl
      path
    }
  }
`;

interface CreateAvatarUploadUrlResult {
  createAvatarUploadUrl: AvatarUploadUrlPayload;
}

export function createAvatarUploadUrl(mimeType: string) {
  return graphqlRequest<CreateAvatarUploadUrlResult, { mimeType: string }>(
    CREATE_AVATAR_UPLOAD_URL_MUTATION,
    { mimeType },
  );
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
