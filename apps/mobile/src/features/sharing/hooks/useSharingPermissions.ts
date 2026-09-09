import { useQuery } from "@tanstack/react-query";
import { fetchSharingPermissions } from "@features/sharing/services/sharing.graphql";
import type { SharingScope } from "@features/sharing/types";

/** Todas as `SharingPermission` visíveis ao usuário na família ativa. */
export function useSharingPermissions(familyId: string) {
  return useQuery({
    queryKey: ["sharingPermissions", familyId],
    queryFn: () => fetchSharingPermissions(familyId),
    enabled: Boolean(familyId),
  });
}

/**
 * Localiza a `SharingPermission` de um recurso específico (scope + targetId)
 * dentro da lista da família — usada pelas telas `sharing/<scope>/[id]`.
 * Retorna `undefined` quando o recurso ainda não tem registro de
 * compartilhamento (ver SUPOSIÇÃO em `sharing.graphql.ts`).
 */
export function useSharingPermissionFor(
  familyId: string,
  scope: SharingScope,
  targetId: string,
) {
  const query = useSharingPermissions(familyId);
  const permission = query.data?.sharingPermissions.find(
    (p) => p.scope === scope && p.targetId === targetId,
  );
  return { ...query, permission };
}
