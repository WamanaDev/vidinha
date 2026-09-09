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

// specs/design/components/amount.md §6.3 — accessibilityLabel por extenso, em
// português, sem símbolos ("R$"). Não precisa ser extenso linguístico completo
// (ex.: "três mil e duzentos"), só não pode conter o símbolo de moeda.
function accessibilityLabelForAmount(value: number): string {
  const abs = Math.abs(value);
  const reais = Math.trunc(abs);
  const centavos = Math.round((abs - reais) * 100);

  const reaisFormatted = new Intl.NumberFormat("pt-BR").format(reais);
  let quantia = `${reaisFormatted} ${reais === 1 ? "real" : "reais"}`;
  if (centavos > 0) {
    quantia += ` e ${centavos} ${centavos === 1 ? "centavo" : "centavos"}`;
  }

  const direction = value < 0 ? "saíram" : "entraram";
  return `${direction} ${quantia}`;
}

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
  // NUNCA vermelha. Só entrada usa money.in (verde). Zero é sempre neutro
  // (specs/design/components/amount.md §1.3) — não é entrada nem saída.
  const color = !colorByValue
    ? tokens.money.neutral
    : value > 0
      ? tokens.money.in
      : value < 0
        ? tokens.money.out
        : tokens.money.neutral;

  if (hideValue) {
    return (
      <Text
        style={[
          VARIANT_STYLE[variant],
          { color: tokens.money.hidden, letterSpacing: 2 },
        ]}
        accessibilityLabel="valor oculto"
      >
        {"R$ ••••"}
      </Text>
    );
  }

  const sign = colorByValue && value > 0 ? "+" : "";

  return (
    <Text
      style={[VARIANT_STYLE[variant], { color }]}
      accessibilityLabel={accessibilityLabelForAmount(value)}
    >
      {sign}
      {formatBRL(value)}
    </Text>
  );
}
