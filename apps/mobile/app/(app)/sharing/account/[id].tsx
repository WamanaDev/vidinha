import { useLocalSearchParams } from "expo-router";
import { SharingSettingsView } from "@features/sharing/components/SharingSettingsView";

// specs/mobile/routes/stack/sharing-settings.md — rota `/(app)/sharing/account/[id]`.
export default function SharingAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SharingSettingsView scope="ACCOUNT" targetId={id ?? ""} />;
}
