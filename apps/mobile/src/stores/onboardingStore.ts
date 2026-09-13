import { create } from "zustand";

// specs/mobile/00-overview.md §3.2 — código de referência completo.
interface OnboardingState {
  step: "welcome" | "create-family" | "invite-members";
  familyName: string;
  // SUPOSIÇÃO: o `id` da família recém-criada não fazia parte do shape
  // original desta store (specs/mobile/00-overview.md §3.2) — necessário aqui
  // porque `inviteMember(input: InviteMemberInput!)` exige `familyId` (SDL
  // real, packages/graphql-schema/schema.graphql), e a tela invite-members.tsx
  // não recebe esse valor por parâmetro de rota.
  familyId: string;
  inviteEmails: string[];
  setStep: (step: OnboardingState["step"]) => void;
  setFamilyName: (name: string) => void;
  setFamilyId: (id: string) => void;
  addInviteEmail: (email: string) => void;
  removeInviteEmail: (email: string) => void;
  reset: () => void;
}

const initialState = {
  step: "welcome" as const,
  familyName: "",
  familyId: "",
  inviteEmails: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setFamilyName: (familyName) => set({ familyName }),
  setFamilyId: (familyId) => set({ familyId }),
  addInviteEmail: (email) =>
    set((s) => ({ inviteEmails: [...new Set([...s.inviteEmails, email])] })),
  removeInviteEmail: (email) =>
    set((s) => ({ inviteEmails: s.inviteEmails.filter((e) => e !== email) })),
  reset: () => set(initialState),
}));
