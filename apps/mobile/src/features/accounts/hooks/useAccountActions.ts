import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAccount,
  updateAccount,
  archiveAccount,
} from "@features/accounts/services/accounts.graphql";
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@app-types/graphql-generated";

// Mesmo padrão de `useRecurringExpenseActions.ts` — `useMutation` +
// `onSuccess` invalidando a queryKey `["accounts", familyId]` usada por
// `useAccounts`.

/** Criar conta manual — `accounts/new`. */
export function useCreateAccount(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", familyId] });
    },
  });
}

/** Editar conta manual — `account/[id]` (edição). */
export function useUpdateAccount(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAccountInput) => updateAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", familyId] });
    },
  });
}

/** Arquivar conta manual — ação destrutiva, sempre com confirmação
 * (`Alert.alert`) antes de chamar `mutate`. */
export function useArchiveAccount(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", familyId] });
    },
  });
}
