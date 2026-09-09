import { Stack } from "expo-router";

// Grupo público — sem sessão válida (specs/mobile/00-overview.md §1).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
