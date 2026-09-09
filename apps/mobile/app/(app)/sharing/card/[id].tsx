import { useLocalSearchParams } from "expo-router";
import { SharingSettingsView } from "@features/sharing/components/SharingSettingsView";

// specs/mobile/routes/stack/sharing-settings.md — rota `/(app)/sharing/card/[id]`.
export default function SharingCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SharingSettingsView scope="CARD" targetId={id ?? ""} />;
}
