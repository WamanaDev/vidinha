import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space, radius } from "@config/theme/spacing";

// specs/mobile/design-system/bottom-sheet.md — interface (não redefinir props aqui).
export interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];
  children: ReactNode;
}

// SUPOSIÇÃO: specs/design/components/bottom-sheet.md descreve gestos de
// arrastar, snap points animados via spring e integração com
// `@gorhom/bottom-sheet`, mas essa dependência não está instalada no projeto
// (apps/mobile/package.json). Implementado com `Modal` nativo (`transparent`,
// `animationType="slide"`) + scrim, sem arrasto/gestos e sem múltiplos snap
// points — cobre o caso de uso de seleção de opções/confirmação (§3.1/§3.2 da
// spec de estilo) sem adicionar uma dependência nova sem avaliação prévia
// (claude.md §17). `snapPoints` é aceito na interface mas ignorado nesta
// implementação; a altura máxima é fixa em 90% da tela, conforme §1.
export function BottomSheet({
  isVisible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const tokens = useTokens();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Fechar"
        style={{ flex: 1, backgroundColor: "rgba(36,30,26,0.45)" }}
        onPress={onClose}
      />
      <View
        style={{
          maxHeight: "90%",
          backgroundColor: tokens.bg.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingHorizontal: space[5],
          paddingTop: space[2],
          paddingBottom: space[8],
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: tokens.border.default,
            alignSelf: "center",
            marginBottom: space[4],
          }}
        />
        {title ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: space[4],
            }}
          >
            <Text style={[typeScale.h2, { color: tokens.text.primary }]}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              onPress={onClose}
            >
              <X size={24} color={tokens.icon.muted} />
            </Pressable>
          </View>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}
