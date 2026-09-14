import { useMutation } from "@tanstack/react-query";
import { completeUserProfile } from "@features/auth/services/auth.graphql";

/** Primeiro login após cadastro — `(auth)/sign-up`. */
export function useCompleteUserProfile() {
  return useMutation({
    mutationFn: (displayName: string) => completeUserProfile({ displayName }),
  });
}
