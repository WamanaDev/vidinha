import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Amount } from "@components/Amount";
import { Button } from "@components/Button";
import { Card as SurfaceCard } from "@components/Card";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { useActiveFamily } from "@lib/activeFamilyContext";
import { useCards, findCardById } from "@features/cards/hooks/useCards";
import { useArchiveCard } from "@features/cards/hooks/useCardActions";
import type { GraphQLApiError } from "@lib/graphqlClient";
import { mapErrorCodeToMessage } from "@lib/errorMapping";

// specs/mobile/routes/stack/account-detail.md (§"Detalhe de cartão") — rota
// `/(app)/card/[id]`. Não há query singular `card(id)` no SDL real — o
// cartão é derivado da lista já buscada por `cards(familyId)`.
export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { data, isLoading, isError, error, refetch } = useCards(familyId);
  const archiveCard = useArchiveCard(familyId);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleGoBack = () => router.replace("/(app)/(tabs)/cards");

  const card = findCardById(data?.cards, id);

  // Precisa vir antes dos `return`s condicionais abaixo (regras de hooks —
  // claude.md/eslint `react-hooks/rules-of-hooks`).
  const handleArchive = useCallback(() => {
    if (!card) return;
    // Ação destrutiva — sempre com confirmação (claude.md §"nunca destrutivo
    // sem confirmação", mesmo padrão de `open-finance/connections.tsx`).
    // Arquivar (excluir da lista) é permitido para qualquer cartão, manual
    // ou sincronizado via Open Finance — o usuário pode querer esconder um
    // cartão específico sem desconectar a instituição inteira (ver
    // 00-DECISIONS.md §12).
    Alert.alert(
      "Excluir cartão",
      `${card.name} vai deixar de aparecer nos seus cartões. Os lançamentos já feitos continuam guardados${card.connection ? ", e a instituição continua conectada normalmente (os outros cartões/contas dela não são afetados)" : ""}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setArchiveError(null);
            archiveCard.mutate(card.id, {
              onSuccess: handleGoBack,
              onError: (err) =>
                setArchiveError(
                  mapErrorCodeToMessage((err as GraphQLApiError)?.code),
                ),
            });
          },
        },
      ],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, archiveCard]);

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: tokens.bg.app, padding: space[5] }}
      >
        <Skeleton width="100%" height={28} borderRadius={6} />
        <View style={{ height: space[4] }} />
        <Skeleton width="100%" height={120} borderRadius={12} />
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  if (!card) {
    // Estado not-found (specs/mobile/routes/stack/account-detail.md §"Estados"):
    // id não encontrado na lista já buscada de `cards(familyId)`.
    return (
      <EmptyState
        title="Não achamos esse cartão"
        description="Ele pode não estar mais disponível ou você não tem acesso a ele."
        actionLabel="Voltar para Cartões"
        onAction={handleGoBack}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg.app }}
      contentContainerStyle={{ padding: space[5] }}
    >
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        {card.name}
      </Text>
      {card.lastFourDigits ? (
        <Text
          style={[
            typeScale.caption,
            { color: tokens.text.secondary, marginTop: space[1] },
          ]}
        >
          {`•••• ${card.lastFourDigits}`}
        </Text>
      ) : null}

      {card.currentInvoice != null ? (
        <View style={{ marginTop: space[4] }}>
          <Amount value={card.currentInvoice} variant="large" />
        </View>
      ) : null}

      <View style={{ marginTop: space[6] }}>
        <SurfaceCard padding="lg">
          <DetailRow
            label="Fatura atual"
            value={
              card.currentInvoice != null
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(card.currentInvoice)
                : "—"
            }
          />
          <DetailRow
            label="Limite"
            value={
              card.limit != null
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(card.limit)
                : "—"
            }
          />
          <DetailRow
            label="Compartilhado com a família"
            value={card.sharedWithFamily ? "Sim" : "Não"}
            isLast
          />
        </SurfaceCard>
      </View>

      <View style={{ marginTop: space[8] }}>
        <Button
          label="Configurar compartilhamento"
          onPress={() => router.push(`/sharing/card/${card.id}`)}
          variant="primary"
          fullWidth
        />
      </View>

      <View style={{ marginTop: space[3] }}>
        <Button
          label="Excluir cartão"
          onPress={handleArchive}
          loading={archiveCard.isPending}
          variant="destructive"
          fullWidth
        />
        {archiveError ? (
          <Text
            style={[
              typeScale.caption,
              { color: tokens.state.error.fg, marginTop: space[2] },
            ]}
          >
            {archiveError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const tokens = useTokens();
  return (
    <View style={{ marginBottom: isLast ? 0 : space[4] }}>
      <Text style={[typeScale.label, { color: tokens.text.secondary }]}>
        {label}
      </Text>
      <Text
        style={[
          typeScale.body,
          { color: tokens.text.primary, marginTop: space[1] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
