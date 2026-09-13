import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@features/categories/services/categories.graphql";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@features/categories/types";

/** Criar categoria — `categories/new`. */
export function useCreateCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", familyId] });
    },
  });
}

/** Editar categoria (nome/ícone/ocultar da família) — `categories/[id]/edit`. */
export function useUpdateCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => updateCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", familyId] });
    },
  });
}

/** Excluir categoria — `categories/[id]/edit`. */
export function useDeleteCategory(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", familyId] });
    },
  });
}
