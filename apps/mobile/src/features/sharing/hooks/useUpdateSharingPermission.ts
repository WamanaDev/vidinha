import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSharingPermission } from "@features/sharing/services/sharing.graphql";
import type { UpdateSharingPermissionInput } from "@features/sharing/services/sharing.graphql";

/** Atualiza `sharedWithFamily`/`fullDetailShared` — telas `sharing/<scope>/[id]`. */
export function useUpdateSharingPermission(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSharingPermissionInput) =>
      updateSharingPermission(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sharingPermissions", familyId],
      });
    },
  });
}
