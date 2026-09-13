import { useCallback } from "react";
import { FlatList, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { Skeleton } from "@components/Skeleton";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { useCategories } from "@features/categories/hooks/useCategories";
import type { Category } from "@features/categories/types";

export interface CategoryPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  familyId: string;
  selectedCategoryId?: string | null;
  onSelect: (category: Category) => void;
}

/**
 * Seletor de categoria reutilizável — usado em `transaction/[id].tsx` (trocar
 * categoria de um lançamento) e nos formulários de `recurring-expenses/*`
 * (categoria opcional). Segue specs/design/components/bottom-sheet.md §3.1
 * (lista de opções com `Check` na selecionada).
 */
export function CategoryPickerSheet({
  isVisible,
  onClose,
  familyId,
  selectedCategoryId,
  onSelect,
}: CategoryPickerSheetProps) {
  const tokens = useTokens();
  const { data, isLoading, isError, error, refetch } = useCategories(familyId);

  const handleSelect = useCallback(
    (category: Category) => {
      onSelect(category);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: Category }) => (
      <ListItem
        title={item.name}
        leftElement={
          item.icon ? (
            <Text style={{ fontSize: 20, width: 24, textAlign: "center" }}>
              {item.icon}
            </Text>
          ) : undefined
        }
        onPress={() => handleSelect(item)}
        rightElement={
          selectedCategoryId === item.id ? (
            <Check size={20} color={tokens.icon.active} />
          ) : undefined
        }
      />
    ),
    [handleSelect, selectedCategoryId, tokens.icon.active],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="Escolher categoria"
    >
      {isLoading ? (
        <Skeleton width="100%" height={56} borderRadius={12} count={4} />
      ) : isError ? (
        <View>
          <Text
            style={[
              typeScale.body,
              { color: tokens.state.error.fg, marginBottom: space[3] },
            ]}
          >
            {(error as { message?: string })?.message ??
              "Não conseguimos carregar as categorias agora."}
          </Text>
          <Text
            style={[typeScale.caption, { color: tokens.text.link }]}
            onPress={() => refetch()}
          >
            Tentar de novo
          </Text>
        </View>
      ) : (data?.categories.length ?? 0) === 0 ? (
        <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
          Vocês ainda não têm categorias criadas.
        </Text>
      ) : (
        <FlatList
          data={data?.categories ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={{ maxHeight: 360 }}
        />
      )}
    </BottomSheet>
  );
}
