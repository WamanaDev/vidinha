import { memo } from "react";
import { ListItem } from "@components/ListItem";
import { Amount } from "@components/Amount";
import type { AccountWithInstitution } from "@features/accounts/types";

export interface AccountListItemProps {
  account: AccountWithInstitution;
  onPress?: () => void;
}

// SUPOSIÇÃO: sem query própria de logo/ícone de conta por tipo definida na
// spec (specs/mobile/00-overview.md §16.3 fala de `institutionLogoUrl` via
// `expo-image`, mas não há endpoint dedicado nem `AccountTypeIcon` com
// arquivo de referência) — a v1 do item de lista usa só título/subtítulo/
// valor, sem ícone, para não inventar asset fora do design system existente.
function AccountListItemBase({ account, onPress }: AccountListItemProps) {
  return (
    <ListItem
      title={account.name}
      subtitle={`${account.institutionName}${account.maskedNumber ? ` · ${account.maskedNumber}` : ""}`}
      onPress={onPress}
      rightElement={<Amount value={account.balance} variant="compact" />}
    />
  );
}

export const AccountListItem = memo(AccountListItemBase);
