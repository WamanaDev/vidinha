import { useCallback } from "react";
import { FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import type { ConnectorCredentialOption } from "@features/open-finance/types";

export interface CredentialSelectSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: ConnectorCredentialOption[];
  selected: string;
  onSelect: (value: string) => void;
}

// Mesmo padrão de `FrequencyPickerSheet`
// (src/features/recurring-expenses/components/FrequencyPickerSheet.tsx),
// reaproveitado para o campo de credencial `type: 'select'` da Pluggy
// (ex.: escolha de agência/tipo de conta em alguns conectores).
export function CredentialSelectSheet({
  isVisible,
  onClose,
  title,
  options,
  selected,
  onSelect,
}: CredentialSelectSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConnectorCredentialOption }) => (
      <ListItem
        title={item.label}
        onPress={() => handleSelect(item.value)}
        rightElement={
          selected === item.value ? (
            <Check size={20} color={tokens.icon.active} />
          ) : undefined
        }
      />
    ),
    [handleSelect, selected, tokens.icon.active],
  );

  const keyExtractor = useCallback(
    (item: ConnectorCredentialOption) => item.value,
    [],
  );

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title={title}>
      <FlatList
        data={options}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}
