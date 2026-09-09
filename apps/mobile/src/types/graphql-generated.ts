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
