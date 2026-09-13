import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeUserProfile,
  exportMyData,
  requestAccountDeletion,
} from "@features/settings/services/user.graphql";

interface CompleteProfileInput {
  displayName: string;
  avatarUrl?: string | null;
}

/** Editar `displayName`/`avatarUrl` — `settings/profile`. */
export function useCompleteUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteProfileInput) => completeUserProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

/** Exportar dados do usuário (LGPD) — `settings/export-data`. */
export function useExportMyData() {
  return useMutation({
    mutationFn: () => exportMyData(),
  });
}

/** Solicitar exclusão de conta — `settings/delete-account`. */
export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () => requestAccountDeletion(),
  });
}
