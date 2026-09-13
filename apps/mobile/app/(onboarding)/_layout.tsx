import { Stack } from "expo-router";

// Grupo autenticado, sem família ativa (specs/mobile/00-overview.md §1).
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
