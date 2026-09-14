import type { CardType } from "@app-types/graphql-generated";

// Rótulos amigáveis em pt-BR para `CardType`
// (packages/graphql-schema/schema.graphql linhas 203-207).
export const CARD_TYPE_LABELS: Record<CardType, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PREPAID: "Pré-pago",
};

export const CARD_TYPE_OPTIONS: CardType[] = ["CREDIT", "DEBIT", "PREPAID"];
