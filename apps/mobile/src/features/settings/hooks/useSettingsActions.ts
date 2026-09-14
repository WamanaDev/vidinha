import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  completeUserProfile,
  createAvatarUploadUrl,
  exportMyData,
  requestAccountDeletion,
} from "@features/settings/services/user.graphql";
import {
  pickAvatarFromCamera,
  pickAvatarFromLibrary,
  putAvatarFile,
} from "@features/settings/lib/avatarUpload";
import { cacheAvatarFromUrl, invalidateCachedAvatar } from "@lib/avatarCache";
import type { CompleteProfileInput } from "@app-types/graphql-generated";

/** Editar `displayName`/`avatarPath` — `settings/profile`. */
export function useCompleteUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteProfileInput) => completeUserProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

interface UploadAvatarInput {
  source: "library" | "camera";
  displayName: string;
  userId: string;
}

/**
 * Fluxo completo de troca de foto de perfil (specs/security/file-uploads.md
 * §2): escolher imagem -> `createAvatarUploadUrl` -> `PUT` direto no
 * Supabase Storage -> `completeUserProfile({ avatarPath })`. Também
 * invalida o cache local antigo e já pré-cacheia a nova foto, para a
 * próxima leitura do `Avatar` não depender de mais uma ida à rede.
 * Retorna `null` se o usuário cancelar a escolha da imagem (não é erro).
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ source, displayName, userId }: UploadAvatarInput) => {
      const picked =
        source === "library"
          ? await pickAvatarFromLibrary()
          : await pickAvatarFromCamera();
      if (!picked) return null;

      const { createAvatarUploadUrl: uploadTarget } =
        await createAvatarUploadUrl(picked.mimeType);

      await putAvatarFile(uploadTarget.uploadUrl, picked.uri, picked.mimeType);

      const { completeUserProfile: updatedUser } = await completeUserProfile({
        displayName,
        avatarPath: uploadTarget.path,
      });

      await invalidateCachedAvatar(userId);
      if (updatedUser.avatarUrl) {
        await cacheAvatarFromUrl(userId, updatedUser.avatarUrl);
      }

      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      if (updatedUser) {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
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
