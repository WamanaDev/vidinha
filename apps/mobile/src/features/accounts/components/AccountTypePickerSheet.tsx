import { useCallback } from "react";
import { FlatList } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_OPTIONS,
} from "@features/accounts/accountTypeLabels";
import type { AccountType } from "@app-types/graphql-generated";

export interface AccountTypePickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selected: AccountType;
  onSelect: (type: AccountType) => void;
}

// Mesmo padrão de `FrequencyPickerSheet` — seletor das 6 opções reais de
// `AccountType` (SDL, linhas 92-99).
export function AccountTypePickerSheet({
  isVisible,
  onClose,
  selected,
  onSelect,
}: AccountTypePickerSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (type: AccountType) => {
      onSelect(type);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: AccountType }) => (
      <ListItem
        title={ACCOUNT_TYPE_LABELS[item]}
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

  const keyExtractor = useCallback((item: AccountType) => item, []);

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Tipo de conta">
      <FlatList
        data={ACCOUNT_TYPE_OPTIONS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}
