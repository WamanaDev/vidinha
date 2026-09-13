// specs/design/tokens/colors.md §2-3 — tokens semânticos, light e dark.
// Nenhum componente importa `palette` diretamente: sempre via useTokens().
import { palette as p } from "./palette";

export interface Tokens {
  bg: {
    app: string;
    surface: string;
    surfaceSunken: string;
    surfaceSelected: string;
    surfaceHover: string;
    surfaceRaised: string;
    overlay: string;
  };
  border: {
    default: string;
    strong: string;
    focus: string;
    error: string;
    subtle: string;
  };
  text: {
    primary: string;
    body: string;
    secondary: string;
    disabled: string;
    inverse: string;
    link: string;
  };
  icon: {
    default: string;
    muted: string;
    active: string;
    disabled: string;
  };
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
  action: {
    primary: {
      bg: string;
      bgPressed: string;
      bgDisabled: string;
      fg: string;
      fgDisabled: string;
    };
    secondary: { bg: string; bgPressed: string; border: string; fg: string };
    ghost: { fg: string; bgPressed: string };
    destructive: { fg: string; bgPressed: string };
  };
  state: {
    success: { fg: string; bg: string; onBg: string };
    warning: { fg: string; bg: string; onBg: string };
    error: { fg: string; bg: string; onBg: string };
    info: { fg: string; bg: string; onBg: string };
    neutral: { fg: string; bg: string; onBg: string };
  };
  money: {
    in: string;
    out: string;
    neutral: string;
    negativeLabel: string;
    hidden: string;
  };
}

export const lightTokens: Tokens = {
  bg: {
    app: p.neutro.leite,
    surface: p.neutro.papel,
    surfaceSunken: p.neutro.areia100,
    surfaceSelected: p.terracota[50],
    surfaceHover: p.terracota[100],
    surfaceRaised: p.neutro.papel,
    overlay: "rgba(36,30,26,0.45)",
  },
  border: {
    default: p.neutro.areia200,
    strong: p.neutro.areia400,
    focus: p.terracota[600],
    error: p.semantico.erro,
    subtle: p.neutro.areia100,
  },
  text: {
    primary: p.neutro.grafite900,
    body: p.neutro.grafite800,
    secondary: p.neutro.cha600,
    disabled: p.neutro.areia400,
    inverse: p.neutro.papel,
    link: p.terracota[700],
  },
  icon: {
    default: p.neutro.grafite800,
    muted: p.neutro.cha600,
    active: p.terracota[600],
    disabled: p.neutro.areia400,
  },
  brand: {
    primary: p.terracota[500],
    secondary: p.manjericao[600],
    accent: p.manteiga[400],
  },
  action: {
    primary: {
      bg: p.terracota[600],
      bgPressed: p.terracota[700],
      bgDisabled: p.neutro.areia100,
      fg: p.neutro.papel,
      fgDisabled: p.neutro.areia400,
    },
    secondary: {
      bg: "transparent",
      bgPressed: p.neutro.areia100,
      border: p.neutro.areia200,
      fg: p.neutro.grafite900,
    },
    ghost: { fg: p.terracota[700], bgPressed: p.terracota[50] },
    destructive: { fg: p.semantico.erro, bgPressed: p.derivado.erro50 },
  },
  state: {
    success: {
      fg: p.manjericao[600],
      bg: p.manjericao[50],
      onBg: p.manjericao[800],
    },
    warning: {
      fg: p.manteiga[700],
      bg: p.manteiga[100],
      onBg: p.manteiga[700],
    },
    error: {
      fg: p.semantico.erro,
      bg: p.derivado.erro50,
      onBg: p.derivado.erro900,
    },
    info: {
      fg: p.semantico.info,
      bg: p.derivado.info50,
      onBg: p.semantico.info,
    },
    neutral: {
      fg: p.neutro.cha600,
      bg: p.neutro.areia100,
      onBg: p.neutro.grafite800,
    },
  },
  money: {
    in: p.manjericao[600],
    out: p.neutro.grafite800,
    neutral: p.neutro.grafite900,
    negativeLabel: p.manteiga[700],
    hidden: p.neutro.areia400,
  },
};

export const darkTokens: Tokens = {
  bg: {
    app: p.dark.fundo,
    surface: p.dark.superficie,
    surfaceSunken: p.dark.fundo,
    surfaceSelected: "rgba(229,138,112,0.14)",
    surfaceHover: "rgba(229,138,112,0.14)",
    surfaceRaised: p.dark.superficie2,
    overlay: "rgba(10,8,7,0.60)",
  },
  border: {
    default: p.dark.borda,
    strong: p.dark.textoSecundario,
    focus: p.dark.terracota,
    error: p.dark.erro,
    subtle: p.dark.superficie2,
  },
  text: {
    primary: p.dark.texto,
    body: p.dark.texto,
    secondary: p.dark.textoSecundario,
    disabled: p.dark.textoSecundario,
    inverse: p.neutro.grafite900,
    link: p.dark.terracota,
  },
  icon: {
    default: p.dark.texto,
    muted: p.dark.textoSecundario,
    active: p.dark.terracota,
    disabled: p.neutro.cha600,
  },
  brand: {
    primary: p.dark.terracota,
    secondary: p.dark.manjericao,
    accent: p.manteiga[400],
  },
  action: {
    primary: {
      bg: p.dark.terracota,
      bgPressed: p.terracota[500],
      bgDisabled: p.dark.superficie2,
      fg: p.neutro.grafite900,
      fgDisabled: p.neutro.cha600,
    },
    secondary: {
      bg: "transparent",
      bgPressed: p.dark.superficie2,
      border: p.dark.borda,
      fg: p.dark.texto,
    },
    ghost: { fg: p.dark.terracota, bgPressed: "rgba(229,138,112,0.14)" },
    destructive: { fg: p.dark.erro, bgPressed: "rgba(242,184,181,0.14)" },
  },
  state: {
    success: {
      fg: p.dark.manjericao,
      bg: "rgba(127,191,156,0.16)",
      onBg: p.dark.manjericao,
    },
    warning: {
      fg: p.manteiga[400],
      bg: "rgba(242,180,65,0.16)",
      onBg: p.manteiga[400],
    },
    error: { fg: p.dark.erro, bg: "rgba(242,184,181,0.16)", onBg: p.dark.erro },
    info: {
      fg: p.derivado.info300,
      bg: "rgba(143,182,206,0.16)",
      onBg: p.derivado.info300,
    },
    neutral: {
      fg: p.dark.textoSecundario,
      bg: p.dark.superficie2,
      onBg: p.dark.texto,
    },
  },
  money: {
    in: p.dark.manjericao,
    out: p.dark.texto,
    neutral: p.dark.texto,
    negativeLabel: p.manteiga[400],
    hidden: p.neutro.cha600,
  },
};
