import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTokens } from "@config/theme";

// Grupo público — sem sessão válida (specs/mobile/00-overview.md §1).
// `SafeAreaView` (top) evita que o conteúdo (sem header nativo) renderize
// sob a barra de status/notch — bug relatado em teste em dispositivo real.
export default function AuthLayout() {
  const tokens = useTokens();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
