import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCard,
  updateCard,
  archiveCard,
} from "@features/cards/services/cards.graphql";
import type {
  CreateCardInput,
  UpdateCardInput,
} from "@app-types/graphql-generated";

// Mesmo padrão de `useRecurringExpenseActions.ts` — `useMutation` +
// `onSuccess` invalidando a queryKey `["cards", familyId]` usada por `useCards`.

/** Criar cartão manual — `cards/new`. */
export function useCreateCard(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", familyId] });
    },
  });
}

/** Editar cartão manual — `card/[id]` (edição). */
export function useUpdateCard(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCardInput) => updateCard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", familyId] });
    },
  });
}

/** Arquivar cartão manual — ação destrutiva, sempre com confirmação
 * (`Alert.alert`) antes de chamar `mutate`. */
export function useArchiveCard(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", familyId] });
    },
  });
}
