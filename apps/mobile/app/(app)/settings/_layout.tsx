import { Stack } from "expo-router";

// specs/mobile/00-overview.md §1 — grupo `(app)/settings/*`.
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
