import type { RecurrenceFrequency } from "@features/recurring-expenses/types";

// Rótulos amigáveis em pt-BR para `RecurrenceFrequency`
// (packages/graphql-schema/schema.graphql linhas 204-211).
export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Toda semana",
  MONTHLY: "Todo mês",
  BIMONTHLY: "A cada 2 meses",
  QUARTERLY: "A cada 3 meses",
  SEMIANNUAL: "A cada 6 meses",
  ANNUAL: "Todo ano",
};

export const FREQUENCY_OPTIONS: RecurrenceFrequency[] = [
  "WEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
];
