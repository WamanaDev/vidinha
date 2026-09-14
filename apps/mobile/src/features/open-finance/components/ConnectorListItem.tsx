import { memo } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { ListItem } from "@components/ListItem";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import type {
  ConnectorHealthStatus,
  OpenFinanceConnector,
} from "@features/open-finance/types";

export interface ConnectorListItemProps {
  connector: OpenFinanceConnector;
  onPress: () => void;
}

// SUPOSIÇÃO: não há token/spec de cor específico para status de saúde de
// conector Open Finance — reaproveita os tokens semânticos já existentes
// (success/warning), mesmo padrão de `OpenFinanceConnectionCard.tsx`.
function useHealthBadge(
  status: ConnectorHealthStatus | (string & {}) | undefined,
) {
  const tokens = useTokens();
  switch (status) {
    case "ONLINE":
      return { label: "Disponível", color: tokens.state.success.fg };
    case "UNSTABLE":
      return { label: "Instável", color: tokens.state.warning.fg };
    case "OFFLINE":
      return { label: "Fora do ar", color: tokens.state.error.fg };
    default:
      return { label: "", color: tokens.state.neutral.fg };
  }
}

function ConnectorListItemBase({ connector, onPress }: ConnectorListItemProps) {
  const badge = useHealthBadge(connector.health?.status);

  return (
    <ListItem
      title={connector.name}
      onPress={onPress}
      leftElement={
        connector.imageUrl ? (
          <Image
            source={{ uri: connector.imageUrl }}
            style={{ width: 40, height: 40, borderRadius: 8 }}
            contentFit="contain"
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: connector.primaryColor ?? "#E5E1DA",
            }}
          />
        )
      }
      rightElement={
        <Text style={[typeScale.caption, { color: badge.color }]}>
          {badge.label}
        </Text>
      }
    />
  );
}

export const ConnectorListItem = memo(ConnectorListItemBase);
