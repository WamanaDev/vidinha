import { create } from "zustand";

// SUPOSIÇÃO: specs/mobile/routes/stack/settings/notifications.md e
// specs/mobile/00-overview.md ("Suposições desta spec" #3) — não existe
// mutation/tipo `NotificationPreferences` no SDL real (packages/graphql-schema/
// schema.graphql). Esta store é um placeholder de UI com estado local
// (perdido ao fechar o app), sem persistência no backend, até que o schema
// seja estendido pelo time de API.
interface NotificationPreferencesState {
  billsDueSoon: boolean;
  aboveAverageSpending: boolean;
  toggleBillsDueSoon: () => void;
  toggleAboveAverageSpending: () => void;
}

export const useNotificationPreferencesStore =
  create<NotificationPreferencesState>((set) => ({
    billsDueSoon: true,
    aboveAverageSpending: true,
    toggleBillsDueSoon: () => set((s) => ({ billsDueSoon: !s.billsDueSoon })),
    toggleAboveAverageSpending: () =>
      set((s) => ({ aboveAverageSpending: !s.aboveAverageSpending })),
  }));
