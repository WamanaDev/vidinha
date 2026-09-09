// specs/design/tokens/motion.md
import { Easing } from "react-native-reanimated";

export const motion = {
  duration: { instant: 100, fast: 180, normal: 240, slow: 320, shimmer: 1200 },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    out: Easing.bezier(0, 0, 0, 1),
    in: Easing.bezier(0.4, 0, 1, 1),
    linear: Easing.linear,
  },
} as const;
