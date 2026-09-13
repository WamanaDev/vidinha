// specs/design/tokens/typography.md §5
import type { TextStyle } from "react-native";

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayRegular: "Fraunces_400Regular",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
} as const;

const tnum: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  bodyLg: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 },
  labelSm: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20 },
  buttonSm: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18 },

  amountHero: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
    ...tnum,
  },
  amountLg: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
    ...tnum,
  },
  amount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    ...tnum,
  },
  amountCompact: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    ...tnum,
  },
} satisfies Record<string, TextStyle>;
