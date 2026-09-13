import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvite,
  createFamily,
} from "@features/family/services/family.graphql";

/** Criar família nova — `(onboarding)/create-family`. */
export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createFamily({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myFamilies"] });
    },
  });
}

/** Entrar em família via token de convite — `(onboarding)/join-family`. */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteToken: string) => acceptInvite({ inviteToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myFamilies"] });
    },
  });
}
