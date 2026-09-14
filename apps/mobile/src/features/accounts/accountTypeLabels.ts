import type { AccountType } from "@app-types/graphql-generated";

// Rótulos amigáveis em pt-BR para `AccountType`
// (packages/graphql-schema/schema.graphql linhas 92-99). Reaproveitado por
// `accounts/new.tsx`, `account/[id].tsx` e o seletor `AccountTypePickerSheet`.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Carteira",
  CRYPTO: "Carteira digital",
  OTHER: "Outro",
};

export const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  "CHECKING",
  "SAVINGS",
  "INVESTMENT",
  "CASH",
  "CRYPTO",
  "OTHER",
];
