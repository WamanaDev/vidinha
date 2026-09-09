import { graphqlRequest } from "@lib/graphqlClient";
import type {
  Family,
  FamilyMembership,
  FamilyPayload,
} from "@app-types/graphql-generated";

// Nomes de query/mutation e shapes conforme o SDL real de
// packages/graphql-schema/schema.graphql (fonte da verdade — specs/mobile/00-overview.md
// §"Fonte da verdade"). specs/mobile/routes/tabs/family.md ainda descreve só
// `family(id: ID!)`; o SDL real também expõe `myFamilies` (usado pelo
// ActiveFamilyProvider) e as mutations de gestão de membros.

const MY_FAMILIES_QUERY = /* GraphQL */ `
  query MyFamiliesSummary {
    myFamilies {
      id
      role
      joinedAt
      family {
        id
        name
        createdAt
      }
    }
  }
`;

interface MyFamiliesResult {
  myFamilies: FamilyMembership[];
}

export function fetchMyFamilies() {
  return graphqlRequest<MyFamiliesResult>(MY_FAMILIES_QUERY);
}

const FAMILY_QUERY = /* GraphQL */ `
  query FamilyDetail($id: ID!) {
    family(id: $id) {
      id
      name
      createdAt
      myRole
      members {
        id
        role
        joinedAt
        user {
          id
          email
          displayName
          avatarUrl
        }
      }
    }
  }
`;

interface FamilyQueryVariables {
  id: string;
}

interface FamilyQueryResult {
  family: Family;
}

export function fetchFamily(variables: FamilyQueryVariables) {
  return graphqlRequest<FamilyQueryResult, FamilyQueryVariables>(
    FAMILY_QUERY,
    variables,
  );
}

const INVITE_MEMBER_MUTATION = /* GraphQL */ `
  mutation InviteMember($input: InviteMemberInput!) {
    inviteMember(input: $input) {
      invite {
        id
        email
        status
        expiresAt
      }
    }
  }
`;

interface InviteMemberInput {
  familyId: string;
  email: string;
}

// SUPOSIÇÃO: o SDL retorna `FamilyInvitePayload` (invite), não `FamilyPayload`
// — mantido fiel ao schema real, ainda que a tela de Família em si só precise
// do resultado para exibir feedback/toast, sem reler o invite completo.
interface InviteMemberResult {
  inviteMember: {
    invite: { id: string; email: string; status: string; expiresAt: string };
  };
}

export function inviteMember(input: InviteMemberInput) {
  return graphqlRequest<InviteMemberResult, { input: InviteMemberInput }>(
    INVITE_MEMBER_MUTATION,
    { input },
  );
}

const REMOVE_MEMBER_MUTATION = /* GraphQL */ `
  mutation RemoveMember($input: RemoveMemberInput!) {
    removeMember(input: $input) {
      family {
        id
        members {
          id
          role
          joinedAt
          user {
            id
            email
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;

interface RemoveMemberInput {
  familyId: string;
  membershipId: string;
}

interface RemoveMemberResult {
  removeMember: FamilyPayload;
}

export function removeMember(input: RemoveMemberInput) {
  return graphqlRequest<RemoveMemberResult, { input: RemoveMemberInput }>(
    REMOVE_MEMBER_MUTATION,
    { input },
  );
}

const PROMOTE_MEMBER_MUTATION = /* GraphQL */ `
  mutation PromoteMember($input: PromoteMemberInput!) {
    promoteMember(input: $input) {
      family {
        id
        members {
          id
          role
          joinedAt
          user {
            id
            email
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;

interface PromoteMemberInput {
  familyId: string;
  membershipId: string;
}

interface PromoteMemberResult {
  promoteMember: FamilyPayload;
}

export function promoteMember(input: PromoteMemberInput) {
  return graphqlRequest<PromoteMemberResult, { input: PromoteMemberInput }>(
    PROMOTE_MEMBER_MUTATION,
    { input },
  );
}

const CREATE_FAMILY_MUTATION = /* GraphQL */ `
  mutation CreateFamily($input: CreateFamilyInput!) {
    createFamily(input: $input) {
      family {
        id
        name
        createdAt
        myRole
        members {
          id
          role
          joinedAt
          user {
            id
            email
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;

interface CreateFamilyInput {
  name: string;
}

interface CreateFamilyResult {
  createFamily: FamilyPayload;
}

/** Criar uma família nova — `(onboarding)/create-family`. */
export function createFamily(input: CreateFamilyInput) {
  return graphqlRequest<CreateFamilyResult, { input: CreateFamilyInput }>(
    CREATE_FAMILY_MUTATION,
    { input },
  );
}

const ACCEPT_INVITE_MUTATION = /* GraphQL */ `
  mutation AcceptInvite($input: AcceptInviteInput!) {
    acceptInvite(input: $input) {
      family {
        id
        name
        createdAt
        myRole
        members {
          id
          role
          joinedAt
          user {
            id
            email
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;

interface AcceptInviteInput {
  inviteToken: string;
}

interface AcceptInviteResult {
  acceptInvite: FamilyPayload;
}

/** Entrar em uma família via token de convite — `(onboarding)/join-family`. */
export function acceptInvite(input: AcceptInviteInput) {
  return graphqlRequest<AcceptInviteResult, { input: AcceptInviteInput }>(
    ACCEPT_INVITE_MUTATION,
    { input },
  );
}

const LEAVE_FAMILY_MUTATION = /* GraphQL */ `
  mutation LeaveFamily($familyId: ID!) {
    leaveFamily(familyId: $familyId)
  }
`;

interface LeaveFamilyResult {
  leaveFamily: boolean;
}

export function leaveFamily(familyId: string) {
  return graphqlRequest<LeaveFamilyResult, { familyId: string }>(
    LEAVE_FAMILY_MUTATION,
    { familyId },
  );
}
