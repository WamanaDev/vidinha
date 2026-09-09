import { Switch, Text, View } from "react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// SUPOSIÇÃO: não existe um componente `Switch`/`Toggle` no design system
// implementado em `src/components/` (nem em specs/mobile/design-system/) —
// usamos o `Switch` nativo do React Native estilizado com os tokens de cor já
// existentes (`tokens.action.primary`), em vez de inventar um componente novo
// fora da lista de 12 componentes especificados em 00-overview.md §4.
export interface SharingScopeToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SharingScopeToggle({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: SharingScopeToggleProps) {
  const tokens = useTokens();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: space[3],
        gap: space[3],
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typeScale.body, { color: tokens.text.primary }]}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.text.secondary, marginTop: space[1] },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: tokens.border.default,
          true: tokens.action.primary.bg,
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}
