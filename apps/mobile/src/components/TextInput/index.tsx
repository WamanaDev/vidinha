import { useState } from "react";
import { Text, TextInput as RNTextInput, View } from "react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space, radius } from "@config/theme/spacing";

// specs/mobile/design-system/text-input.md — interface (não redefinir props aqui).
export interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  rightAdornment?: React.ReactNode;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  rightAdornment,
}: TextInputProps) {
  const tokens = useTokens();
  const [focused, setFocused] = useState(false);

  // specs/design/components/text-input.md §2-3 — afunda em repouso, sobe ao focar.
  const bg = error
    ? focused
      ? tokens.bg.surface
      : tokens.state.error.bg
    : focused
      ? tokens.bg.surface
      : tokens.bg.surfaceSunken;
  const borderColor = error
    ? tokens.border.error
    : focused
      ? tokens.border.focus
      : tokens.border.default;
  const borderWidth = error || focused ? 2 : 1;
  const labelColor = error
    ? tokens.state.error.fg
    : focused
      ? tokens.text.link
      : tokens.text.secondary;

  return (
    <View style={{ marginBottom: space[6] }}>
      <Text
        style={[
          typeScale.label,
          { color: labelColor, marginBottom: space[1] + 2 },
        ]}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 52,
          borderRadius: radius.sm,
          borderWidth,
          borderColor,
          backgroundColor: bg,
          paddingHorizontal: space[4],
        }}
      >
        <RNTextInput
          accessibilityLabel={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.text.disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            typeScale.body,
            { flex: 1, color: tokens.text.primary, paddingVertical: 14 },
          ]}
        />
        {rightAdornment}
      </View>
      {error ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.state.error.fg, marginTop: space[1] + 2 },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
