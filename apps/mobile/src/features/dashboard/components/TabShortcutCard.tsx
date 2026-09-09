import { memo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Card } from "@components/Card";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

export interface TabShortcutCardProps {
  icon: ReactNode;
  label: string;
  onPress: () => void;
}

// SUPOSIÇÃO: specs/mobile/routes/tabs/home.md não descreve componentes de UI
// específicos para os atalhos (só cita `ConsolidatedSummaryCard`,
// `CategoryBreakdownChart`, `UpcomingBillsList`, todos fora do escopo da v1
// simples pedida nesta tarefa). Este componente é novo, mas reutiliza só o
// `Card` do design system existente, sem inventar estilo próprio.
function TabShortcutCardBase({ icon, label, onPress }: TabShortcutCardProps) {
  const tokens = useTokens();

  return (
    <Card onPress={onPress} padding="md">
      <View style={{ alignItems: "center", gap: space[2] }}>
        {icon}
        <Text
          style={[typeScale.labelSm, { color: tokens.text.primary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Card>
  );
}

export const TabShortcutCard = memo(TabShortcutCardBase);
