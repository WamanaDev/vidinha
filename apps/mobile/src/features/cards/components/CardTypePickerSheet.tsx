import { useCallback } from "react";
import { FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import {
  CARD_TYPE_LABELS,
  CARD_TYPE_OPTIONS,
} from "@features/cards/cardTypeLabels";
import type { CardType } from "@app-types/graphql-generated";

export interface CardTypePickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selected: CardType;
  onSelect: (type: CardType) => void;
}

// Mesmo padrão de `FrequencyPickerSheet`/`AccountTypePickerSheet` — seletor
// das 3 opções reais de `CardType` (SDL, linhas 203-207).
export function CardTypePickerSheet({
  isVisible,
  onClose,
  selected,
  onSelect,
}: CardTypePickerSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (type: CardType) => {
      onSelect(type);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: CardType }) => (
      <ListItem
        title={CARD_TYPE_LABELS[item]}
        onPress={() => handleSelect(item)}
        rightElement={
          selected === item ? (
            <Check size={20} color={tokens.icon.active} />
          ) : undefined
        }
      />
    ),
    [handleSelect, selected, tokens.icon.active],
  );

  const keyExtractor = useCallback((item: CardType) => item, []);

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Tipo de cartão">
      <FlatList
        data={CARD_TYPE_OPTIONS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}
