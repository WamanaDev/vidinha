import { memo, useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Check,
  Plus,
  Settings,
  Landmark,
  Link2,
  PenLine,
} from "lucide-react-native";
import { ListItem } from "@components/ListItem";
import { BottomSheet } from "@components/BottomSheet";
import { Avatar } from "@components/Avatar";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useAuth } from "@lib/authContext";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";

// SUPOSIÇÃO: não existe spec dedicada em specs/mobile/design-system/ nem em
// specs/design/components/ para um "AppHeader" fixo com troca de família —
// esta é uma tela nova (Fase 3 do plano combinado com o dono do produto).
// Segue o mesmo padrão visual/estrutural de `ListItem`/`BottomSheet` já
// especificados. Substitui a navegação para `/(app)/settings/families`
// (mantida no código, sem uso direto pelo menu de Configurações — ver
// comentário em `settings/index.tsx` e `settings/families.tsx`).
export interface AppHeaderProps {
  // Reservado para uso futuro (ex.: título customizado por tab); hoje o
  // header sempre mostra o nome da família ativa.
}

function AppHeaderBase(_props: AppHeaderProps) {
  const tokens = useTokens();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { familyId, families, setActiveFamilyId } = useActiveFamily();
  const [sheetVisible, setSheetVisible] = useState(false);
  // Sub-menu empilhado (2 telas em BottomSheets separados, mesma abordagem já
  // usada em `open-finance/connect.tsx` para múltiplos passos) — "Adicionar
  // conta" agora oferece a escolha entre Open Finance e cadastro manual.
  const [addAccountSheetVisible, setAddAccountSheetVisible] = useState(false);

  const activeFamily = families.find((f) => f.id === familyId);

  // Mesmo fallback de nome usado em `(tabs)/index.tsx:88-91`.
  const displayName =
    (session?.user?.user_metadata?.display_name as string | undefined) ||
    session?.user?.email ||
    "";

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const handleSwitchFamily = useCallback(
    (id: string) => {
      if (id !== familyId) {
        setActiveFamilyId(id);
        // Mesma lógica de invalidação de `settings/families.tsx`: evita
        // esperar o `staleTime` de telas já visitadas antes de a nova
        // família ativa refletir nos dados exibidos.
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["cards"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["family"] });
      }
      closeSheet();
    },
    [familyId, setActiveFamilyId, queryClient, closeSheet],
  );

  const handleJoinOrCreateFamily = useCallback(() => {
    closeSheet();
    router.push("/(onboarding)/welcome");
  }, [closeSheet, router]);

  const handleGoToProfile = useCallback(() => {
    closeSheet();
    router.push("/(app)/settings/profile");
  }, [closeSheet, router]);

  const handleOpenAddAccountMenu = useCallback(() => {
    closeSheet();
    setAddAccountSheetVisible(true);
  }, [closeSheet]);

  const closeAddAccountSheet = useCallback(
    () => setAddAccountSheetVisible(false),
    [],
  );

  const handleConnectOpenFinance = useCallback(() => {
    closeAddAccountSheet();
    // SUPOSIÇÃO: `as never` contorna o mesmo bug conhecido do gerador de
    // typed routes do Expo Router no Windows citado em
    // `open-finance/connect.tsx` / `settings/index.tsx`.
    router.push("/(app)/open-finance/connect" as never);
  }, [closeAddAccountSheet, router]);

  const handleAddAccountManually = useCallback(() => {
    closeAddAccountSheet();
    router.push("/(app)/accounts/new" as never);
  }, [closeAddAccountSheet, router]);

  const handleGoToSettings = useCallback(() => {
    closeSheet();
    router.push("/(app)/settings");
  }, [closeSheet, router]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Família ativa: ${activeFamily?.name ?? ""}. Toque para trocar de família ou acessar atalhos.`}
        onPress={() => setSheetVisible(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: space[1],
          paddingHorizontal: space[4],
          paddingVertical: space[3],
          backgroundColor: tokens.bg.surface,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border.default,
        }}
      >
        <Text
          numberOfLines={1}
          style={[typeScale.h3, { color: tokens.text.primary }]}
        >
          {activeFamily?.name ?? "Vidinha"}
        </Text>
        <ChevronDown color={tokens.icon.muted} size={18} />
      </Pressable>

      <BottomSheet
        isVisible={sheetVisible}
        onClose={closeSheet}
        title="Sua família"
      >
        <View>
          {families.map((family) => (
            <ListItem
              key={family.id}
              title={family.name}
              onPress={() => handleSwitchFamily(family.id)}
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
            onPress={handleJoinOrCreateFamily}
          />
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: tokens.border.subtle,
            marginVertical: space[3],
          }}
        />

        <View>
          <ListItem
            title={displayName || "Meu perfil"}
            subtitle="Ver perfil"
            leftElement={<Avatar name={displayName || "?"} size={36} />}
            onPress={handleGoToProfile}
          />
          <ListItem
            title="Adicionar conta"
            leftElement={<Landmark color={tokens.icon.default} size={22} />}
            onPress={handleOpenAddAccountMenu}
          />
          <ListItem
            title="Configurações"
            leftElement={<Settings color={tokens.icon.default} size={22} />}
            onPress={handleGoToSettings}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        isVisible={addAccountSheetVisible}
        onClose={closeAddAccountSheet}
        title="Adicionar conta"
      >
        <ListItem
          title="Conectar via Open Finance"
          subtitle="Sincroniza automaticamente com seu banco"
          leftElement={<Link2 color={tokens.icon.default} size={22} />}
          onPress={handleConnectOpenFinance}
        />
        <ListItem
          title="Adicionar conta manualmente"
          subtitle="Você cadastra e atualiza os dados"
          leftElement={<PenLine color={tokens.icon.default} size={22} />}
          onPress={handleAddAccountManually}
        />
      </BottomSheet>
    </>
  );
}

// specs/mobile/design-system convenção (ver `ListItem`) — React.memo obrigatório.
export const AppHeader = memo(AppHeaderBase);
