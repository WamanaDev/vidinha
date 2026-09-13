import { useCallback } from "react";
import { FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
} from "@features/recurring-expenses/frequencyLabels";
import type { RecurrenceFrequency } from "@features/recurring-expenses/types";

export interface FrequencyPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selected: RecurrenceFrequency;
  onSelect: (frequency: RecurrenceFrequency) => void;
}

/** Seletor das 6 opções reais de `RecurrenceFrequency` (SDL, linhas 204-211). */
export function FrequencyPickerSheet({
  isVisible,
  onClose,
  selected,
  onSelect,
}: FrequencyPickerSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (frequency: RecurrenceFrequency) => {
      onSelect(frequency);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: RecurrenceFrequency }) => (
      <ListItem
        title={FREQUENCY_LABELS[item]}
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

  const keyExtractor = useCallback((item: RecurrenceFrequency) => item, []);

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Frequência">
      <FlatList
        data={FREQUENCY_OPTIONS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}
