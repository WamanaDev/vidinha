import { useColorScheme } from "react-native";
import { lightTokens, darkTokens, type Tokens } from "./tokens";

export { palette } from "./palette";
export { lightTokens, darkTokens, type Tokens } from "./tokens";
export { type as typeScale, fonts } from "./typography";
export { space, radius } from "./spacing";
export { motion } from "./motion";

/**
 * Hook único de consumo de tokens (specs/design/tokens/colors.md §7):
 * "Consumo obrigatório via hook: const t = useTokens();" — resolve
 * light/dark a partir de useColorScheme(). Nenhum componente do design
 * system importa `palette`/tokens diretamente.
 */
export function useTokens(): Tokens {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTokens : lightTokens;
}

// SUPOSIÇÃO: specs/mobile/routes/auth/login.md e routes/app-layout.md (código de
// referência já pronto) consomem um objeto `theme` estático simples
// (theme.spacing.lg, theme.colors.text, theme.typography.h1 como número de
// fontSize), enquanto specs/design define o sistema completo de tokens
// light/dark via useTokens(). Não há como reconciliar sem alterar o código de
// referência (que devo copiar fielmente) — este objeto `theme` é um atalho
// estático (sempre light) só para essas telas de auth iniciais. Componentes do
// design system usam useTokens()/useElevation(), nunca este objeto.
export const theme = {
  colors: {
    background: lightTokens.bg.app,
    surface: lightTokens.bg.surface,
    text: lightTokens.text.primary,
    textMuted: lightTokens.text.secondary,
    primary: lightTokens.action.primary.bg,
    border: lightTokens.border.default,
    error: lightTokens.state.error.fg,
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  typography: { h1: 26, h2: 20, h3: 17, body: 15, caption: 12 },
} as const;

// specs/design/tokens/elevation-radius-icons.md §2 — sombras quentes (nunca preto puro).
// No dark mode a elevação vira cor/borda, nunca sombra (shadowOpacity/elevation = 0).
export function useElevation() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return {
    none: { shadowOpacity: 0, elevation: 0 },
    low: isDark
      ? { shadowOpacity: 0, elevation: 0 }
      : {
          shadowColor: "#3A312C",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
    medium: isDark
      ? { shadowOpacity: 0, elevation: 0 }
      : {
          shadowColor: "#3A312C",
          shadowOpacity: 0.12,
          shadowRadius: 32,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
  } as const;
}
