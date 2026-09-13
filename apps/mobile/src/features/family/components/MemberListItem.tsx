import { memo } from "react";
import { Text } from "react-native";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import type { FamilyMembership } from "@features/family/types";

export interface MemberListItemProps {
  membership: FamilyMembership;
  onPress?: () => void;
}

// SUPOSIÇÃO: não há um componente `Badge` implementado ainda em
// `src/components/` (só o descrito em specs/mobile/design-system/badge.md,
// sem código pronto no repo) — o papel (ADMIN/MEMBER) é exibido como texto
// simples no subtítulo em vez de um badge visual, até o componente existir.
const ROLE_LABEL: Record<FamilyMembership["role"], string> = {
  ADMIN: "Administrador(a)",
  MEMBER: "Integrante",
};

function MemberListItemBase({ membership, onPress }: MemberListItemProps) {
  const tokens = useTokens();
  const name = membership.user.displayName || membership.user.email;

  return (
    <ListItem
      title={name}
      subtitle={ROLE_LABEL[membership.role]}
      onPress={onPress}
      rightElement={
        onPress ? (
          <Text style={[typeScale.caption, { color: tokens.text.secondary }]}>
            {">"}
          </Text>
        ) : undefined
      }
    />
  );
}

export const MemberListItem = memo(MemberListItemBase);
