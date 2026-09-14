import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react-native";
import { ListItem } from "@components/ListItem";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// Uma pessoa pode fazer parte de mais de uma família (00-DECISIONS.md) — esta
// tela deixa trocar a família ativa e entrar no fluxo de onboarding
// (`(onboarding)/welcome`) para criar/entrar em mais uma a qualquer momento,
// não só no primeiro acesso.
//
// SUBSTITUÍDA pelo `AppHeader` fixo no topo das tabs principais (Fase 3) —
// ver `src/components/AppHeader/index.tsx`, que reaproveita esta mesma lógica
// de troca/invalidação de queries dentro de um bottom sheet. O item de menu
// que levava aqui foi removido de `settings/index.tsx`; a rota continua
// registrada mas sem ponto de entrada na UI.
export default function FamiliesScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const queryClient = useQueryClient();
  const { familyId, families, setActiveFamilyId } = useActiveFamily();

  const handleSwitch = useCallback(
    (id: string) => {
      if (id === familyId) return;
      setActiveFamilyId(id);
      // As telas dependentes (contas, cartões, lançamentos, família) já
      // usam `familyId` na queryKey e reagem à mudança de contexto sozinhas
      // — mas invalidamos aqui também para não esperar o `staleTime` de cada
      // uma quando o usuário volta para uma família já visitada antes (dados
      // em cache ficariam visivelmente desatualizados por alguns segundos).
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["family"] });
      router.back();
    },
    [familyId, setActiveFamilyId, queryClient, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text
        style={[
          typeScale.h1,
          { color: tokens.text.primary, padding: space[4] },
        ]}
      >
        Minhas famílias
      </Text>

      {families.map((family) => (
        <ListItem
          key={family.id}
          title={family.name}
          onPress={() => handleSwitch(family.id)}
          rightElement={
            family.id === familyId ? (
              <Check color={tokens.action.primary.bg} size={20} />
            ) : undefined
          }
        />
      ))}

      <ListItem
        title="Criar ou entrar em outra família"
        leftElement={<Plus color={tokens.icon.default} size={22} />}
        onPress={() => router.push("/(onboarding)/welcome")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
