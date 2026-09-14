import { memo } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { radius } from "@config/theme/spacing";

// SUPOSIÇÃO: não existe spec em specs/mobile/design-system/ nem em
// specs/design/components/ para um componente `Avatar` — upload/exibição de
// foto real de perfil é Fase 4 (outro agente). Implementado aqui como um
// círculo simples com as iniciais do nome (sem imagem), usando os tokens de
// cor de ação primária já existentes, seguindo o mesmo padrão de props/estilo
// de `ListItem` (React.memo obrigatório, claude.md §16.1/§16.3).
export interface AvatarProps {
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function AvatarBase({ name, size = 40 }: AvatarProps) {
  const tokens = useTokens();

  const containerStyle: StyleProp<ViewStyle> = {
    width: size,
    height: size,
    borderRadius: radius.full,
    backgroundColor: tokens.action.primary.bg,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <View
      style={containerStyle}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text
        style={[
          typeScale.labelSm,
          { color: tokens.action.primary.fg, fontWeight: "600" },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

export const Avatar = memo(AvatarBase);
