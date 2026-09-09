import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useTokens, type Tokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space, radius } from "@config/theme/spacing";

// specs/mobile/design-system/button.md — interface (não redefinir props aqui).
export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// specs/design/components/button.md §1 — geometria por tamanho.
const SIZES = {
  sm: {
    minHeight: 36,
    paddingHorizontal: space[3],
    typography: typeScale.buttonSm,
    iconSize: 16,
    hitSlopV: 6,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: space[4],
    typography: typeScale.button,
    iconSize: 20,
    hitSlopV: 2,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: space[5],
    typography: typeScale.button,
    iconSize: 20,
    hitSlopV: 0,
  },
} as const;

function getColors(
  tokens: Tokens,
  variant: NonNullable<ButtonProps["variant"]>,
  pressed: boolean,
  disabled: boolean,
) {
  const { action } = tokens;
  switch (variant) {
    case "primary":
      return {
        bg: disabled
          ? action.primary.bgDisabled
          : pressed
            ? action.primary.bgPressed
            : action.primary.bg,
        fg: disabled ? action.primary.fgDisabled : action.primary.fg,
        border: undefined as string | undefined,
      };
    case "secondary":
      return {
        bg: pressed ? action.secondary.bgPressed : action.secondary.bg,
        fg: disabled ? tokens.text.disabled : action.secondary.fg,
        border: action.secondary.border,
      };
    case "ghost":
      return {
        bg: pressed ? action.ghost.bgPressed : "transparent",
        fg: disabled ? tokens.text.disabled : action.ghost.fg,
        border: undefined,
      };
    case "destructive":
      return {
        bg: pressed ? action.destructive.bgPressed : "transparent",
        fg: disabled ? tokens.text.disabled : action.destructive.fg,
        border: undefined,
      };
  }
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
}: ButtonProps) {
  const tokens = useTokens();
  const [pressed, setPressed] = useState(false);
  const lockedWidth = useRef<number | null>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  const dims = SIZES[size];
  const colors = getColors(tokens, variant, pressed, disabled || loading);
  const isGhostLike = variant === "ghost" || variant === "destructive";

  const handleLayout = (e: LayoutChangeEvent) => {
    // specs/design/components/button.md §4 — largura trava antes do spinner entrar.
    if (lockedWidth.current === null) {
      lockedWidth.current = e.nativeEvent.layout.width;
      setWidth(e.nativeEvent.layout.width);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={undefined}
      onLayout={handleLayout}
      style={{
        minHeight: dims.minHeight,
        paddingHorizontal: isGhostLike ? space[3] : dims.paddingHorizontal,
        borderRadius: radius.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: space[2],
        backgroundColor: colors.bg,
        borderWidth: colors.border ? 1.5 : 0,
        borderColor: colors.border,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        width: fullWidth ? undefined : width,
      }}
      hitSlop={{ top: dims.hitSlopV, bottom: dims.hitSlopV, left: 0, right: 0 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}
        >
          {leftIcon}
          <Text
            numberOfLines={1}
            style={[dims.typography, { color: colors.fg }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
