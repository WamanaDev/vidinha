import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTokens, useElevation } from "@config/theme";
import { space, radius } from "@config/theme/spacing";

// specs/mobile/design-system/card.md — interface (não redefinir props aqui).
export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
  elevation?: "none" | "low" | "medium";
}

const PADDING = { none: 0, sm: space[3], md: space[4], lg: space[5] } as const;

export function Card({
  children,
  onPress,
  padding = "md",
  elevation = "low",
}: CardProps) {
  const tokens = useTokens();
  const elevationStyles = useElevation();
  const [pressed, setPressed] = useState(false);

  const baseStyle = {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.default,
    backgroundColor: pressed ? tokens.bg.surfaceSunken : tokens.bg.surface,
    padding: PADDING[padding],
    overflow: "hidden" as const,
    ...elevationStyles[elevation],
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessible
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        android_ripple={undefined}
        style={[baseStyle, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}
