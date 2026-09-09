// Ponto único de import de tipos GraphQL para o app (specs/mobile/00-overview.md §1,
// "Suposições desta spec" #5). Reexporta @vidinha/graphql-types (workspace package).
//
// TODO: rodar codegen quando o schema do backend tiver mais types — hoje
// packages/graphql-schema/schema.graphql e, consequentemente,
// packages/graphql-types/src/index.ts (`export {}`) ainda não definem os tipos
// de domínio (Transaction, Account, Card, etc.), porque o backend está sendo
// bootstrapped em paralelo em outra branch. Os tipos abaixo são placeholders
// mínimos, com o mesmo shape assumido em specs/mobile/routes/tabs/transactions.md,
// só para o app compilar; devem ser DELETADOS assim que
// `pnpm --filter @vidinha/graphql-types codegen` gerar os tipos reais — a
// partir daí este arquivo volta a ser um `export *` puro do pacote.
// `@vidinha/graphql-types` ainda não exporta nada (packages/graphql-types/src/index.ts
// é só `export {}` até o primeiro `pnpm codegen`) — o `export *` fica comentado
// para não quebrar o lint (import/export: "No named exports found") enquanto
// o pacote estiver vazio. Descomentar assim que o codegen gerar tipos reais.
// export * from '@vidinha/graphql-types';

export interface TransactionNode {
  id: string;
  description: string;
  amount: number;
  date: string;
  hiddenFromFamily: boolean;
  category?: { id: string; name: string; icon: string } | null;
  account?: { id: string; name: string } | null;
  card?: { id: string; name: string } | null;
}

export interface TransactionEdge {
  cursor: string;
  node: TransactionNode;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

export interface TransactionConnection {
  edges: TransactionEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface TransactionFilterInput {
  familyId: string;
  [key: string]: unknown;
}

export interface TransactionOrderInput {
  [key: string]: unknown;
}

// --- Tipos abaixo espelham o SDL real já implementado em
// packages/graphql-schema/schema.graphql (family + open-finance), adicionados
// para as telas de dashboard/accounts/cards/family. Mesma justificativa do
// bloco de Transaction acima: ficam aqui só até o codegen real gerar
// @vidinha/graphql-types a partir do schema.

export type FamilyRole = "ADMIN" | "MEMBER";

export interface UserSummary {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface FamilySummary {
  id: string;
  name: string;
  createdAt: string;
}

export interface FamilyMembership {
  id: string;
  family: FamilySummary;
  user: UserSummary;
  role: FamilyRole;
  joinedAt: string;
}

export interface Family extends FamilySummary {
  members: FamilyMembership[];
  myRole: FamilyRole;
}

export interface FamilyPayload {
  family: Family;
}

export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "OTHER";

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  maskedNumber?: string | null;
  currency: string;
  balance: number;
}

export type ConnectionStatus =
  "CONNECTED" | "UPDATING" | "LOGIN_ERROR" | "OUTDATED" | "ERROR" | "REVOKED";

export interface OpenFinanceConnection {
  id: string;
  institutionName: string;
  institutionLogoUrl?: string | null;
  status: ConnectionStatus;
  lastSyncedAt?: string | null;
  createdAt: string;
  accounts: Account[];
}

// --- Tipos abaixo espelham `User`/`DataExportPayload`/`FamilyInvite` do SDL
// real (packages/graphql-schema/schema.graphql), adicionados para as telas de
// onboarding (create-or-join-family, invite-members) e settings (profile,
// security-mfa, data-export-deletion). Mesma justificativa dos blocos acima:
// placeholder até o codegen real gerar @vidinha/graphql-types.

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface DataExportPayload {
  downloadUrl: string;
  expiresAt: string;
}

export type InviteStatus =
  "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "DECLINED";

export interface FamilyInvite {
  id: string;
  email: string;
  status: InviteStatus;
  expiresAt: string;
}

export interface FamilyInvitePayload {
  invite: FamilyInvite;
}
