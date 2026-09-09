import { Text } from "react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";

// specs/mobile/design-system/amount.md — interface (não redefinir props aqui).
export interface AmountProps {
  value: number;
  currency?: string;
  variant?: "default" | "compact" | "large";
  colorByValue?: boolean;
  hideValue?: boolean;
}

const VARIANT_STYLE = {
  default: typeScale.amount,
  compact: typeScale.amountCompact,
  large: typeScale.amountLg,
} as const;

function formatBRL(value: number): string {
  // sinal U+2212 (menos matemático) em vez de hífen — specs/design/components/amount.md
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(value));
  return value < 0 ? `−${formatted}` : formatted;
}

export function Amount({
  value,
  variant = "default",
  colorByValue = false,
  hideValue = false,
}: AmountProps) {
  const tokens = useTokens();

  // specs/design/tokens/colors.md §2.6 / §3.6 — despesa é neutra (preta/creme),
  // NUNCA vermelha. Só entrada usa money.in (verde).
  const color = colorByValue
    ? value > 0
      ? tokens.money.in
      : tokens.money.out
    : tokens.money.neutral;

  if (hideValue) {
    return (
      <Text
        style={[VARIANT_STYLE[variant], { color: tokens.money.hidden }]}
        accessibilityLabel="Valor oculto"
      >
        {"••••"}
      </Text>
    );
  }

  const sign = colorByValue && value > 0 ? "+" : "";

  return (
    <Text
      style={[VARIANT_STYLE[variant], { color }]}
      accessibilityLabel={`${value < 0 ? "saíram" : "entraram"} ${formatBRL(value)}`}
    >
      {sign}
      {formatBRL(value)}
    </Text>
  );
}
