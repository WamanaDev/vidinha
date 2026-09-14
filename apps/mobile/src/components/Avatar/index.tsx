import { memo, useEffect, useState } from "react";
import { Text, View, useColorScheme } from "react-native";
import { Image } from "expo-image";
import { useTokens } from "@config/theme";
import { fonts } from "@config/theme/typography";

// specs/mobile/design-system/avatar.md — interface (não redefinir props aqui).
// specs/design/components/avatar.md — estilo visual exato (tamanhos, cores de
// fallback, estados). Sem conhecimento de GraphQL/domínio: `fallbackInitials`
// já deve chegar calculado (ver `@lib/avatarInitials`).
export interface AvatarProps {
  uri?: string | null;
  fallbackInitials: string;
  size?: "xs" | "sm" | "md" | "lg";
}

// specs/design/components/avatar.md §1.
const SIZES: Record<
  NonNullable<AvatarProps["size"]>,
  { diameter: number; fontSize: number; lineHeight: number; border: boolean }
> = {
  xs: { diameter: 24, fontSize: 10, lineHeight: 12, border: false },
  sm: { diameter: 32, fontSize: 12, lineHeight: 14, border: false },
  md: { diameter: 40, fontSize: 15, lineHeight: 18, border: false },
  lg: { diameter: 64, fontSize: 24, lineHeight: 28, border: true },
};

// specs/design/components/avatar.md §2 — paleta de fallback determinística
// por `fallbackInitials` (5 tons), light e dark.
const FALLBACK_LIGHT = [
  { bg: "#F6DDD4", fg: "#54211A" },
  { bg: "#EEF3EF", fg: "#1D4433" },
  { bg: "#FDF3DC", fg: "#8A5F10" },
  { bg: "#E8EEF2", fg: "#3A6B8A" },
  { bg: "#F2EBE1", fg: "#3A312C" },
];

const FALLBACK_DARK = [
  { bg: "rgba(229,138,112,0.20)", fg: "#E58A70" },
  { bg: "rgba(127,191,156,0.20)", fg: "#7FBF9C" },
  { bg: "rgba(242,180,65,0.20)", fg: "#F2B441" },
  { bg: "rgba(143,182,206,0.20)", fg: "#8FB6CE" },
  { bg: "#2F2925", fg: "#F2EBE3" },
];

function fallbackIndex(initials: string): number {
  return [...initials].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 5, 7);
}

function AvatarBase({ uri, fallbackInitials, size = "md" }: AvatarProps) {
  const tokens = useTokens();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const dims = SIZES[size];
  const idx = fallbackIndex(fallbackInitials);
  const fallback = (isDark ? FALLBACK_DARK : FALLBACK_LIGHT)[idx]!;
  const [showFallback, setShowFallback] = useState(!uri);

  // Reseta o fallback quando `uri` muda (ex.: troca de usuário reaproveitando
  // a mesma instância do componente, ou nova foto após upload).
  useEffect(() => {
    setShowFallback(!uri);
  }, [uri]);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={fallbackInitials}
      style={{
        width: dims.diameter,
        height: dims.diameter,
        borderRadius: dims.diameter / 2,
        backgroundColor: fallback.bg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: dims.border ? 2 : 0,
        borderColor: tokens.bg.surface,
        overflow: "hidden",
      }}
    >
      {!showFallback && uri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
          transition={180}
          onError={() => setShowFallback(true)}
        />
      ) : (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: dims.fontSize,
            lineHeight: dims.lineHeight,
            color: fallback.fg,
          }}
        >
          {fallbackInitials.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

// specs/mobile/00-overview.md — React.memo obrigatório em itens renderizados
// repetidamente (mesmo padrão de `ListItem`).
export const Avatar = memo(AvatarBase);
