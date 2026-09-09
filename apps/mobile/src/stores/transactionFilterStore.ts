import { create } from "zustand";
import type { TransactionFilterInput } from "@app-types/graphql-generated";

// SUPOSIÇÃO: specs/mobile/routes/tabs/transactions.md consome
// `useTransactionFilterStore((s) => s.filter)`, mas o shape completo do filtro
// (campos de data/categoria/conta) não está definido nas specs lidas até agora
// — implementado como um objeto aberto e conservador (sem `familyId`, que é
// injetado pela tela a partir de `useActiveFamily()`), estendível conforme
// `routes/stack/*` (filtros avançados) forem implementados.
type TransactionFilter = Omit<TransactionFilterInput, "familyId">;

interface TransactionFilterState {
  filter: TransactionFilter;
  setFilter: (filter: TransactionFilter) => void;
  resetFilter: () => void;
}

const initialFilter: TransactionFilter = {};

export const useTransactionFilterStore = create<TransactionFilterState>(
  (set) => ({
    filter: initialFilter,
    setFilter: (filter) => set({ filter }),
    resetFilter: () => set({ filter: initialFilter }),
  }),
);
