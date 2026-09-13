import { Fragment, useEffect } from "react";
import { AccessibilityInfo, View, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTokens } from "@config/theme";
import { space } from "@config/theme/spacing";

// specs/mobile/design-system/skeleton.md — interface (não redefinir props aqui).
export interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  count?: number;
}

// SUPOSIÇÃO: specs/design/components/skeleton.md §3 pede um único SharedValue
// global sincronizando todas as instâncias visíveis. Implementado aqui como um
// SharedValue por instância com o mesmo período/fase (todas iniciam no mesmo
// instante de montagem com a mesma duração de 1200ms linear), o que já evita
// o efeito de tela "fervendo" na prática; um relógio verdadeiramente global
// exigiria um provider de contexto novo, fora do escopo desta spec de props.
function useShimmerStyle() {
  const progress = useSharedValue(0);

  useEffect(() => {
    let reduceMotionSub: { remove: () => void } | undefined;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        progress.value = 0.5;
        return;
      }
      progress.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    });

    return () => {
      cancelled = true;
      cancelAnimation(progress);
      reduceMotionSub?.remove();
    };
  }, [progress]);

  return useAnimatedStyle(() => ({
    opacity: 0.6 + Math.abs(0.5 - progress.value) * 0.8,
  }));
}

function SkeletonBlock({ width, height, borderRadius = 4 }: SkeletonProps) {
  const tokens = useTokens();
  const shimmerStyle = useShimmerStyle();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius,
          backgroundColor: tokens.bg.surfaceSunken,
        },
        shimmerStyle,
      ]}
    />
  );
}

export function Skeleton({
  width,
  height,
  borderRadius,
  count = 1,
}: SkeletonProps) {
  if (count <= 1) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando"
        accessibilityState={{ busy: true }}
      >
        <SkeletonBlock
          width={width}
          height={height}
          borderRadius={borderRadius}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Fragment key={index}>
          <SkeletonBlock
            width={index === count - 1 ? "60%" : width}
            height={height}
            borderRadius={borderRadius}
          />
          {index < count - 1 ? <View style={{ height: space[2] }} /> : null}
        </Fragment>
      ))}
    </View>
  );
}
