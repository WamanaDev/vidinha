import { memo } from "react";
import { ListItem } from "@components/ListItem";
import { Amount } from "@components/Amount";
import type { Card } from "@features/cards/types";

export interface CardListItemProps {
  card: Card;
  onPress?: () => void;
}

function CardListItemBase({ card, onPress }: CardListItemProps) {
  return (
    <ListItem
      title={card.name}
      subtitle={card.lastFourDigits ? `•••• ${card.lastFourDigits}` : undefined}
      onPress={onPress}
      rightElement={
        card.currentInvoice != null ? (
          <Amount value={card.currentInvoice} variant="compact" />
        ) : undefined
      }
    />
  );
}

export const CardListItem = memo(CardListItemBase);
