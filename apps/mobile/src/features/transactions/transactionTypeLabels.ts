import type { TransactionType } from "@app-types/graphql-generated";

// Rótulos amigáveis em pt-BR para `TransactionType`
// (packages/graphql-schema/schema.graphql linhas 467-470).
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  CREDIT: "Entrada",
  DEBIT: "Saída",
};

export const TRANSACTION_TYPE_OPTIONS: TransactionType[] = ["CREDIT", "DEBIT"];
