import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTokens } from "@config/theme";

// Sem header nativo (headerShown: false, mesmo comportamento herdado do
// Stack raiz) — `SafeAreaView` (top) evita que o conteúdo renderize sob a
// barra de status/notch, bug relatado em teste em dispositivo real.
export default function AccountLayout() {
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
