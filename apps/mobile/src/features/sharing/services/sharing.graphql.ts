import { graphqlRequest } from "@lib/graphqlClient";
import type { SharingPermission } from "@app-types/graphql-generated";

// Nomes de query/mutation e shapes conforme o SDL real de
// packages/graphql-schema/schema.graphql (fonte da verdade — módulo
// sharing-permissions, recém-implementado no backend). specs/mobile/routes/
// stack/sharing-settings.md ainda descreve `updateAccountSharing`/
// `updateCardSharing`/`updateCategory(hiddenFromFamily)` como mutations
// diretas por scope — nenhuma delas existe no SDL real. Seguimos o SDL real:
// uma única mutation genérica `updateSharingPermission`, com o registro
// identificado por `scope` (ACCOUNT/CARD/CATEGORY) + `targetId`, buscado a
// partir de `sharingPermissions(familyId)`.

const SHARING_PERMISSIONS_QUERY = /* GraphQL */ `
  query SharingPermissions($familyId: ID!) {
    sharingPermissions(familyId: $familyId) {
      id
      scope
      targetId
      sharedWithFamily
      fullDetailShared
      updatedAt
      owner {
        id
        email
        displayName
      }
    }
  }
`;

interface SharingPermissionsResult {
  sharingPermissions: SharingPermission[];
}

export function fetchSharingPermissions(familyId: string) {
  return graphqlRequest<SharingPermissionsResult, { familyId: string }>(
    SHARING_PERMISSIONS_QUERY,
    { familyId },
  );
}

const UPDATE_SHARING_PERMISSION_MUTATION = /* GraphQL */ `
  mutation UpdateSharingPermission($input: UpdateSharingPermissionInput!) {
    updateSharingPermission(input: $input) {
      id
      scope
      targetId
      sharedWithFamily
      fullDetailShared
      updatedAt
    }
  }
`;

export interface UpdateSharingPermissionInput {
  id: string;
  sharedWithFamily?: boolean;
  fullDetailShared?: boolean;
}

interface UpdateSharingPermissionResult {
  updateSharingPermission: SharingPermission;
}

// SUPOSIÇÃO: `UpdateSharingPermissionInput` real (apps/api/src/modules/
// sharing-permissions/dto/update-sharing-permission.input.ts) exige um `id`
// de um `SharingPermission` já existente — não há mutation de criação/upsert
// por `scope`+`targetId` no SDL real (diferente do que a tarefa original
// presumia). Enquanto os módulos `accounts`/`cards` (que criariam o registro
// inicial junto com a conta/cartão) não existirem, um recurso "ainda não
// compartilhado" não tem `SharingPermission` para editar — a tela trata esse
// caso como somente leitura (toggles desabilitados) até o registro existir.
export function updateSharingPermission(input: UpdateSharingPermissionInput) {
  return graphqlRequest<
    UpdateSharingPermissionResult,
    { input: UpdateSharingPermissionInput }
  >(UPDATE_SHARING_PERMISSION_MUTATION, { input });
}
