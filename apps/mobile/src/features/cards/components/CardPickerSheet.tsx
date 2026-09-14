import { useCallback } from "react";
import { FlatList, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@components/BottomSheet";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import type { Card } from "@features/cards/types";

export interface CardPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  cards: Card[];
  selectedCardId?: string | null;
  onSelect: (card: Card) => void;
}

/**
 * Seletor de cartão de destino para lançamentos manuais
 * (apps/mobile/app/(app)/transaction/new.tsx).
 *
 * SUPOSIÇÃO: a regra do backend é que um lançamento manual só pode ir em
 * recurso manual, mas o SDL real de `Card` (packages/graphql-schema/schema.graphql)
 * não expõe nenhum campo para distinguir cartão manual de cartão sincronizado
 * via Open Finance (`Card` não tem `connection`/`isManual`, diferente de
 * `Account`, que tem `connection`). Por isso este seletor lista TODOS os
 * cartões da família — se o usuário escolher um cartão sincronizado, o erro
 * de validação do backend (`createTransaction`) é mostrado normalmente no
 * formulário. Reportar essa lacuna do schema para o time de backend.
 */
export function CardPickerSheet({
  isVisible,
  onClose,
  cards,
  selectedCardId,
  onSelect,
}: CardPickerSheetProps) {
  const tokens = useTokens();

  const handleSelect = useCallback(
    (card: Card) => {
      onSelect(card);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderItem = useCallback(
    ({ item }: { item: Card }) => (
      <ListItem
        title={item.name}
        onPress={() => handleSelect(item)}
        rightElement={
          selectedCardId === item.id ? (
            <Check size={20} color={tokens.icon.active} />
          ) : undefined
        }
      />
    ),
    [handleSelect, selectedCardId, tokens.icon.active],
  );

  const keyExtractor = useCallback((item: Card) => item.id, []);

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title="Escolher cartão"
    >
      {cards.length === 0 ? (
        <View>
          <Text style={[typeScale.body, { color: tokens.text.secondary }]}>
            Vocês ainda não têm cartões cadastrados.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={{ maxHeight: 360 }}
        />
      )}
    </BottomSheet>
  );
}
