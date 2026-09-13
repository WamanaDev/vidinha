import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@components/Button";
import { EmptyState } from "@components/EmptyState";
import { Skeleton } from "@components/Skeleton";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCategoryDetail } from "@features/categories/hooks/useCategoryDetail";
import {
  useUpdateCategory,
  useDeleteCategory,
} from "@features/categories/hooks/useCategoryActions";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/categories.md §Editar — rota `/(app)/categories/[id]/edit`.
export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { category, isLoading, isError } = useCategoryDetail(familyId, id);
  const updateCategory = useUpdateCategory(familyId);
  const deleteCategory = useDeleteCategory(familyId);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [hiddenFromFamily, setHiddenFromFamily] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon ?? "");
      setHiddenFromFamily(category.hiddenFromFamily);
    }
  }, [category]);

  const handleSave = useCallback(() => {
    if (!category || !name.trim()) return;
    setFormError(null);
    updateCategory.mutate(
      {
        id: category.id,
        name: name.trim(),
        icon: icon.trim() || undefined,
        hiddenFromFamily,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [category, name, icon, hiddenFromFamily, updateCategory, router]);

  const handleDelete = useCallback(() => {
    if (!category) return;
    Alert.alert(
      "Excluir categoria?",
      `"${category.name}" vai deixar de existir para a família.`,
      [
        { text: "Deixar como está", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setFormError(null);
            deleteCategory.mutate(category.id, {
              onSuccess: () => router.back(),
              onError: (err) => {
                const code = (err as GraphQLApiError)?.code;
                setFormError(
                  code === "CONFLICT"
                    ? "Não dá pra excluir: já existem lançamentos usando esta categoria."
                    : mapErrorCodeToMessage(code),
                );
              },
            });
          },
        },
      ],
    );
  }, [category, deleteCategory, router]);

  if (!id) {
    return (
      <EmptyState
        title="Categoria não encontrada"
        description="O link que você usou não é válido."
        actionLabel="Voltar para categorias"
        onAction={() => router.replace("/(app)/categories")}
      />
    );
  }

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: tokens.bg.app, padding: space[5] }}
      >
        <Skeleton width="100%" height={52} borderRadius={8} count={3} />
      </View>
    );
  }

  if (isError || !category) {
    return (
      <EmptyState
        title="Não achamos essa categoria"
        description="Ela pode ter sido excluída. Volte para a lista e tente de novo."
        actionLabel="Voltar para categorias"
        onAction={() => router.replace("/(app)/categories")}
      />
    );
  }

  if (category.isDefault) {
    return (
      <EmptyState
        title="Categoria padrão do Vidinha"
        description="Categorias padrão não podem ser editadas ou excluídas, mas vocês podem ocultá-las na lista."
        actionLabel="Voltar para categorias"
        onAction={() => router.replace("/(app)/categories")}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Nome da categoria"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        label="Ícone (opcional)"
        value={icon}
        onChangeText={setIcon}
        autoCapitalize="none"
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: space[6],
          gap: space[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typeScale.body, { color: tokens.text.primary }]}>
            Ocultar da família
          </Text>
          <Text
            style={[
              typeScale.caption,
              { color: tokens.text.secondary, marginTop: space[1] },
            ]}
          >
            Ela deixa de aparecer para os outros integrantes.
          </Text>
        </View>
        <Switch
          value={hiddenFromFamily}
          onValueChange={setHiddenFromFamily}
          trackColor={{
            false: tokens.border.default,
            true: tokens.action.primary.bg,
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {formError ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginBottom: space[4] },
          ]}
        >
          {formError}
        </Text>
      ) : null}

      <Button
        label="Salvar"
        onPress={handleSave}
        loading={updateCategory.isPending}
        disabled={!name.trim()}
        fullWidth
      />

      <View style={{ marginTop: space[4] }}>
        <Button
          label="Excluir categoria"
          onPress={handleDelete}
          loading={deleteCategory.isPending}
          variant="destructive"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}
