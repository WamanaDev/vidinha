import { Text, View } from "react-native";
import { Button } from "@components/Button";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// specs/mobile/design-system/error-state.md — interface (não redefinir props aqui).
export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  errorCode?: string;
}

export function ErrorState({
  title = "Algo deu errado",
  description,
  onRetry,
  errorCode,
}: ErrorStateProps) {
  const tokens = useTokens();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: space[5],
        paddingVertical: space[12],
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 88,
          height: 88,
          borderRadius: 999,
          backgroundColor: tokens.state.error.bg,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: space[6],
        }}
      />
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
      {onRetry ? (
        <View style={{ marginTop: space[6] }}>
          <Button
            label="Tentar de novo"
            onPress={onRetry}
            variant="secondary"
            size="md"
          />
        </View>
      ) : null}
      {__DEV__ && errorCode ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.disabled, marginTop: space[2] },
          ]}
        >
          {errorCode}
        </Text>
      ) : null}
    </View>
  );
}
