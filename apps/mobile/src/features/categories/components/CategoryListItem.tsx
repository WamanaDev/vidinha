import { memo } from "react";
import { Switch, Text, View } from "react-native";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import type { Category } from "@features/categories/types";

export interface CategoryListItemProps {
  category: Category;
  onPress?: () => void;
  onToggleHidden: (hiddenFromFamily: boolean) => void;
  togglingHidden?: boolean;
}

// SUPOSIÇÃO: não há `Badge` implementado em `src/components/` (só a spec em
// specs/mobile/design-system/badge.md, sem código) — mesma solução adotada em
// `MemberListItem`: o indicador "Padrão"/"Sua categoria" fica como texto no
// subtítulo em vez de um badge visual.
function CategoryListItemBase({
  category,
  onPress,
  onToggleHidden,
  togglingHidden,
}: CategoryListItemProps) {
  const tokens = useTokens();

  return (
    <ListItem
      title={category.name}
      subtitle={category.isDefault ? "Padrão do Vidinha" : "Sua categoria"}
      leftElement={
        category.icon ? (
          <Text style={[typeScale.h2, { width: 28, textAlign: "center" }]}>
            {category.icon}
          </Text>
        ) : undefined
      }
      onPress={category.isDefault ? undefined : onPress}
      rightElement={
        <View style={{ alignItems: "center" }}>
          <Switch
            value={!category.hiddenFromFamily}
            onValueChange={(shownToFamily) => onToggleHidden(!shownToFamily)}
            disabled={togglingHidden}
            trackColor={{
              false: tokens.border.default,
              true: tokens.action.primary.bg,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      }
    />
  );
}

export const CategoryListItem = memo(CategoryListItemBase);
