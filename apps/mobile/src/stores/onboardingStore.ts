import { create } from "zustand";

// specs/mobile/00-overview.md §3.2 — código de referência completo.
interface OnboardingState {
  step: "welcome" | "create-family" | "invite-members";
  familyName: string;
  inviteEmails: string[];
  setStep: (step: OnboardingState["step"]) => void;
  setFamilyName: (name: string) => void;
  addInviteEmail: (email: string) => void;
  removeInviteEmail: (email: string) => void;
  reset: () => void;
}

const initialState = {
  step: "welcome" as const,
  familyName: "",
  inviteEmails: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setFamilyName: (familyName) => set({ familyName }),
  addInviteEmail: (email) =>
    set((s) => ({ inviteEmails: [...new Set([...s.inviteEmails, email])] })),
  removeInviteEmail: (email) =>
    set((s) => ({ inviteEmails: s.inviteEmails.filter((e) => e !== email) })),
  reset: () => set(initialState),
}));
