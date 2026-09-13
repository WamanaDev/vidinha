import { memo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/design-system/list-item.md — interface (não redefinir props aqui).
export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

function ListItemBase({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  disabled,
}: ListItemProps) {
  const tokens = useTokens();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: subtitle ? 64 : 56,
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        gap: space[3],
        backgroundColor: pressed ? tokens.bg.surfaceSunken : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {leftElement}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[typeScale.body, { color: tokens.text.primary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[typeScale.caption, { color: tokens.text.secondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement}
    </Pressable>
  );
}

// specs/mobile/design-system/list-item.md — React.memo obrigatório (claude.md §16.1/§16.3).
export const ListItem = memo(ListItemBase);
