import { useCallback } from "react";
import { FlatList, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import type { AccountWithInstitution } from "@features/accounts/types";

export interface AccountPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  accounts: AccountWithInstitution[];
  selectedAccountId?: string | null;
  onSelect: (account: AccountWithInstitution) => void;
}

/**
 * Seletor de conta de destino para lançamentos manuais
 * (apps/mobile/app/(app)/transaction/new.tsx). Regra de negócio do backend:
 * um lançamento manual só pode ir em recurso manual — quem chama já filtra
 * `accounts` para `isManual: true` antes de passar para este componente.
 */
export function AccountPickerSheet({
  isVisible,
  onClose,
  accounts,
  selectedAccountId,
  onSelect,
}: AccountPickerSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (account: AccountWithInstitution) => {
      onSelect(account);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: AccountWithInstitution }) => (
      <ListItem
        title={item.name}
        onPress={() => handleSelect(item)}
        rightElement={
          selectedAccountId === item.id ? (
            <Check size={20} color={tokens.icon.active} />
          ) : undefined
        }
      />
    ),
    [handleSelect, selectedAccountId, tokens.icon.active],
  );

  const keyExtractor = useCallback(
    (item: AccountWithInstitution) => item.id,
    [],
  );

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose} title="Escolher conta">
      {accounts.length === 0 ? (
        <View>
          <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
            Vocês ainda não têm contas cadastradas manualmente. Crie uma em
            "Adicionar conta manualmente" antes de lançar aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={{ maxHeight: 360 }}
        />
      )}
    </BottomSheet>
  );
}
