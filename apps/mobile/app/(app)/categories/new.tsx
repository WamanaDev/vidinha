import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCreateCategory } from "@features/categories/hooks/useCategoryActions";
import { mapErrorCodeToMessage } from "@lib/errorMapping";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/routes/stack/categories.md §Criar — rota `/(app)/categories/new`.
export default function NewCategoryScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();
  const createCategory = useCreateCategory(familyId);

  const [name, setName] = useState("");
  // SUPOSIÇÃO: não há seletor de ícones no design system — campo de texto
  // livre, como pedido explicitamente na tarefa.
  const [icon, setIcon] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    setFormError(null);
    createCategory.mutate(
      { familyId, name: name.trim(), icon: icon.trim() || undefined },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          setFormError(mapErrorCodeToMessage((err as GraphQLApiError)?.code));
        },
      },
    );
  }, [familyId, name, icon, createCategory, router]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <TextInput
        label="Nome da categoria"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Supermercado"
      />
      <TextInput
        label="Ícone (opcional)"
        value={icon}
        onChangeText={setIcon}
        placeholder="Ex.: 🛒"
        autoCapitalize="none"
      />
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
        label="Criar categoria"
        onPress={handleSubmit}
        loading={createCategory.isPending}
        disabled={!name.trim()}
        fullWidth
      />
    </ScrollView>
  );
}
