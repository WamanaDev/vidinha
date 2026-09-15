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
  // owner: SDL real (packages/graphql-schema/schema.graphql) tem
  // `Transaction.owner: User!`, adicionado aqui para a tela de detalhe
  // (apps/mobile/app/(app)/transaction/[id].tsx) decidir se a ação de ocultar
  // deve ficar visível/habilitada (só o dono pode ocultar).
  owner: { id: string; displayName?: string | null };
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

// TransactionType (SDL real, packages/graphql-schema/schema.graphql linhas
// 467-470). `CreateTransactionInput`/`UpdateTransactionInput` — linhas
// 457-479 — CRUD manual de lançamentos (apps/mobile/app/(app)/transaction/new.tsx).
export type TransactionType = "DEBIT" | "CREDIT";

export interface CreateTransactionInput {
  accountId?: string | null;
  cardId?: string | null;
  categoryId?: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  occurredAt: string;
}

export interface UpdateTransactionInput {
  id: string;
  description?: string;
  amount?: number;
  type?: TransactionType;
  occurredAt?: string;
  categoryId?: string | null;
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

// AccountType (SDL real, packages/graphql-schema/schema.graphql linhas
// 92-99): ganhou `CASH` e `CRYPTO` além das 4 opções anteriores.
export type AccountType =
  "CHECKING" | "SAVINGS" | "INVESTMENT" | "CASH" | "CRYPTO" | "OTHER";

// `type Account` — SDL real, packages/graphql-schema/schema.graphql. Não tem
// `maskedNumber` (campo removido — a versão anterior deste arquivo assumia um
// SDL diferente do implementado).
export interface Account {
  id: string;
  type: AccountType;
  name: string;
  currency: string;
  balance: number;
  connection?: OpenFinanceConnection | null;
  sharedWithFamily: boolean;
  fullDetailShared: boolean;
  owner: Pick<User, "id">;
}

// `input CreateAccountInput`/`UpdateAccountInput` — SDL real
// (packages/graphql-schema/schema.graphql linhas 404-419). Mutations
// `createAccount`/`updateAccount`/`archiveAccount` — CRUD manual de contas
// (apps/mobile/app/(app)/accounts/new.tsx).
export interface CreateAccountInput {
  familyId: string;
  name: string;
  type: AccountType;
  maskedNumber?: string | null;
  balance: number;
  currency?: string | null;
}

export interface UpdateAccountInput {
  id: string;
  name?: string;
  maskedNumber?: string | null;
  currency?: string | null;
  balance?: number;
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

// CardType (SDL real, packages/graphql-schema/schema.graphql linhas 203-207).
export type CardType = "CREDIT" | "DEBIT" | "PREPAID";

// `type Card` — SDL real, packages/graphql-schema/schema.graphql. Query
// `cards(familyId: ID!): [Card!]!`.
export interface Card {
  id: string;
  name: string;
  type: CardType;
  brand?: string | null;
  lastFourDigits?: string | null;
  limit?: number | null;
  currentInvoice?: number | null;
  dueDate?: string | null;
  // Presente quando o cartão veio de uma sincronização Open Finance; ausente
  // (`null`) para cartão manual — mesma convenção de `Account.connection`
  // (PR #24, paridade Card×Account). `id`/`institutionName` bastam para o
  // client derivar "é manual?" e mostrar o nome da instituição.
  connection?: Pick<OpenFinanceConnection, "id" | "institutionName"> | null;
  sharedWithFamily: boolean;
  owner: Pick<User, "id">;
}

// `input CreateCardInput`/`UpdateCardInput` — SDL real
// (packages/graphql-schema/schema.graphql linhas 426-444). Mutations
// `createCard`/`updateCard`/`archiveCard` — CRUD manual de cartões
// (apps/mobile/app/(app)/cards/new.tsx).
export interface CreateCardInput {
  familyId: string;
  name: string;
  type: CardType;
  brand?: string | null;
  lastFourDigits?: string | null;
  billingAccountId?: string | null;
  creditLimit?: number | null;
  currentInvoice?: number | null;
}

export interface UpdateCardInput {
  id: string;
  name?: string;
  brand?: string | null;
  lastFourDigits?: string | null;
  billingAccountId?: string | null;
  creditLimit?: number | null;
  currentInvoice?: number | null;
}

// --- Tipos abaixo espelham `openFinanceConnectors` (Query) e
// `createOpenFinanceItem`/`sendOpenFinanceItemMfa` (Mutations) do SDL REAL já
// implementado em packages/graphql-schema/schema.graphql (linhas ~118-183,
// 280, 328-330) pelo módulo apps/api/src/modules/open-finance/ — mesma
// justificativa dos blocos acima (placeholder até o codegen real gerar
// @vidinha/graphql-types).

export type ConnectorCredentialType =
  "text" | "password" | "number" | "image" | "select";

export interface ConnectorCredentialOption {
  value: string;
  label: string;
}

export interface ConnectorCredential {
  name: string;
  label: string;
  // SDL real: `String!` livre, não fechado em enum (o provedor pode
  // introduzir um novo tipo sem quebrar o schema) — `ConnectorCredentialType`
  // documenta os valores conhecidos hoje, mas o app trata qualquer outro
  // valor com fallback de texto simples (ver CredentialField.tsx).
  type: ConnectorCredentialType | (string & {});
  placeholder?: string | null;
  validation?: string | null;
  validationMessage?: string | null;
  optional: boolean;
  instructions?: string | null;
  options?: ConnectorCredentialOption[] | null;
}

export type ConnectorHealthStatus = "ONLINE" | "OFFLINE" | "UNSTABLE";

export interface ConnectorHealth {
  status: ConnectorHealthStatus | (string & {});
}

// `type OpenFinanceConnector` — `id` é `Int!` no SDL real (não `ID!`).
export interface OpenFinanceConnector {
  id: number;
  name: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
  type: string;
  country: string;
  credentials: ConnectorCredential[];
  hasMFA: boolean;
  oauth: boolean;
  oauthUrl?: string | null;
  health?: ConnectorHealth | null;
  isOpenFinance: boolean;
  isSandbox: boolean;
}

export interface OpenFinanceUserAction {
  type: string;
  instructions: string;
  expiresAt?: string | null;
}

// `type OpenFinanceItemResult` — retorno direto (sem wrapper `{ item }`) de
// `createOpenFinanceItem`/`sendOpenFinanceItemMfa`. `pluggyItemId` (não
// `connection.id`) é o "itemId" usado nas chamadas seguintes de MFA.
export interface OpenFinanceItemResult {
  connection: OpenFinanceConnection;
  pluggyItemId: string;
  status: string;
  executionStatus?: string | null;
  mfaParameter?: ConnectorCredential | null;
  userAction?: OpenFinanceUserAction | null;
  errorMessage?: string | null;
}

export interface CredentialParameterInput {
  name: string;
  value: string;
}

export interface CreateOpenFinanceItemInput {
  familyId: string;
  connectorId: number;
  parameters: CredentialParameterInput[];
}

export interface SendOpenFinanceItemMfaInput {
  itemId: string;
  parameters: CredentialParameterInput[];
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

// specs/security/file-uploads.md — fluxo de upload de avatar via Supabase
// Storage. `avatarPath` (não `avatarUrl`) é o campo real de
// `CompleteProfileInput` no SDL (`apps/api/src/auth/dto/complete-profile.input.ts`):
// é o `path` retornado por `createAvatarUploadUrl`, nunca uma URL arbitrária.
export interface CompleteProfileInput {
  displayName: string;
  avatarPath?: string | null;
}

// Retorno de `createAvatarUploadUrl(mimeType: String!)`
// (`apps/api/src/auth/entities/avatar-upload-url-payload.entity.ts`).
export interface AvatarUploadUrlPayload {
  uploadUrl: string;
  path: string;
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

// --- Tipos abaixo espelham `SharingPermission` do SDL real
// (packages/graphql-schema/schema.graphql, módulo sharing-permissions),
// adicionados para a tela `(app)/sharing/*`. Mesma justificativa dos blocos
// acima: placeholder até o codegen real gerar @vidinha/graphql-types.

export type SharingScope = "ACCOUNT" | "CARD" | "CATEGORY";

export interface SharingPermission {
  id: string;
  family: FamilySummary;
  owner: UserSummary;
  scope: SharingScope;
  targetId: string;
  sharedWithFamily: boolean;
  fullDetailShared: boolean;
  updatedAt: string;
}

// --- Tipos abaixo espelham `Category`/`RecurringExpense` do SDL real
// (packages/graphql-schema/schema.graphql, linhas ~151-211/339-373),
// adicionados para as telas `(app)/categories/*` e `(app)/recurring-expenses/*`.
// Mesma justificativa dos blocos acima: placeholder até o codegen real gerar
// @vidinha/graphql-types.

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  hiddenFromFamily: boolean;
  isDefault: boolean;
}

export interface CreateCategoryInput {
  familyId: string;
  name: string;
  icon?: string | null;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  icon?: string | null;
  hiddenFromFamily?: boolean;
}

export type RecurrenceFrequency =
  "WEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export interface RecurringExpense {
  id: string;
  family: FamilySummary;
  description: string;
  amount: number;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
  category?: Category | null;
  sharedWithFamily: boolean;
  owner: UserSummary;
}

export interface CreateRecurringExpenseInput {
  familyId: string;
  description: string;
  amount: number;
  frequency: RecurrenceFrequency;
  dueDay: number;
  startDate: string;
  endDate?: string | null;
  categoryId?: string | null;
}

export interface UpdateRecurringExpenseInput {
  id: string;
  description?: string;
  amount?: number;
  frequency?: RecurrenceFrequency;
  dueDay?: number;
  startDate?: string;
  endDate?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
}
