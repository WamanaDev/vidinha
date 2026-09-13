import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inviteMember,
  leaveFamily,
  promoteMember,
  removeMember,
} from "@features/family/services/family.graphql";

/** Convidar um novo membro para a família — `family-management/invite`. */
export function useInviteMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => inviteMember({ familyId, email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family", familyId] });
    },
  });
}

/** Remover um membro — `family-management/member/[membershipId]`. */
export function useRemoveMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      removeMember({ familyId, membershipId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family", familyId] });
    },
  });
}

/** Promover um membro a ADMIN — `family-management/member/[membershipId]`. */
export function usePromoteMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      promoteMember({ familyId, membershipId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family", familyId] });
    },
  });
}

/** Sair da família ativa. */
export function useLeaveFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) => leaveFamily(familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myFamilies"] });
    },
  });
}
