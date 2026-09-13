import { useLocalSearchParams } from "expo-router";
import { SharingSettingsView } from "@features/sharing/components/SharingSettingsView";

// specs/mobile/routes/stack/sharing-settings.md — rota `/(app)/sharing/category/[id]`.
// SUPOSIÇÃO: o SDL real não expõe `updateCategory(hiddenFromFamily)` nem o
// tipo `Category` (módulo `categories` ainda não implementado no backend) —
// esta tela usa o mesmo mecanismo genérico de `SharingPermission`
// (scope CATEGORY) já usado por conta/cartão, em vez de inventar um campo
// que não existe no schema.
export default function SharingCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SharingSettingsView scope="CATEGORY" targetId={id ?? ""} />;
}
