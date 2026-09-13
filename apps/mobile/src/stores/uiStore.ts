import { create } from "zustand";

// SUPOSIÇÃO: shape mínimo para toasts globais (specs/design/tokens/motion.md §3 —
// toast de erro de mutation) e bottom sheets globais, conforme mencionado em
// specs/mobile/00-overview.md §1 sem código de referência específico.
interface Toast {
  id: string;
  message: string;
  tone?: "success" | "error" | "info";
}

interface UiState {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  showToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
