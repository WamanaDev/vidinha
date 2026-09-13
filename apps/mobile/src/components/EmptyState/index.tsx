import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "@components/Button";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/design-system/empty-state.md — interface (não redefinir props aqui).
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const tokens = useTokens();

  return (
    <View
      accessible
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: space[5],
        paddingVertical: space[12],
      }}
    >
      {icon ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            // specs/design/tokens/elevation-radius-icons.md §3 — círculo de
            // ícone usa a superfície elevada (#2F2925 no dark), não o fundo
            // da tela (surfaceSunken).
            backgroundColor: tokens.bg.surfaceRaised,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: space[6],
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text
        style={[
          typeScale.h2,
          { color: tokens.text.primary, textAlign: "center" },
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            typeScale.body,
            {
              color: tokens.text.secondary,
              textAlign: "center",
              maxWidth: 280,
              marginTop: space[2],
            },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: space[6] }}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="primary"
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}
