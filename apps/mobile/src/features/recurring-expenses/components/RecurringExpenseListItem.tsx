import { memo } from "react";
import { ListItem } from "@components/ListItem";
import { Amount } from "@components/Amount";
import { FREQUENCY_LABELS } from "@features/recurring-expenses/frequencyLabels";
import type { RecurringExpense } from "@features/recurring-expenses/types";

export interface RecurringExpenseListItemProps {
  recurringExpense: RecurringExpense;
  onPress?: () => void;
}

function RecurringExpenseListItemBase({
  recurringExpense,
  onPress,
}: RecurringExpenseListItemProps) {
  const nextDue = new Date(recurringExpense.nextDueDate).toLocaleDateString(
    "pt-BR",
  );

  return (
    <ListItem
      title={recurringExpense.description}
      subtitle={`${FREQUENCY_LABELS[recurringExpense.frequency]} · próxima em ${nextDue}`}
      onPress={onPress}
      rightElement={<Amount value={recurringExpense.amount} />}
    />
  );
}

export const RecurringExpenseListItem = memo(RecurringExpenseListItemBase);
