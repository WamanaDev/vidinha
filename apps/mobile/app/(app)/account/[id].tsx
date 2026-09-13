import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Amount } from "@components/Amount";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { EmptyState } from "@components/EmptyState";
import { ErrorState } from "@components/ErrorState";
import { Skeleton } from "@components/Skeleton";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import { useActiveFamily } from "@lib/activeFamilyContext";
import {
  useAccounts,
  findAccountById,
} from "@features/accounts/hooks/useAccounts";
import type { GraphQLApiError } from "@lib/graphqlClient";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  OTHER: "Outra",
};

// specs/mobile/routes/stack/account-detail.md — rota `/(app)/account/[id]`.
// Não há query singular `account(id)` no SDL real — a conta é derivada da
// lista já buscada por `accounts(familyId)` (ver `useAccounts`/`findAccountById`).
export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTokens();
  const { familyId } = useActiveFamily();

  const { accounts, isLoading, isError, error, refetch } =
    useAccounts(familyId);

  const handleGoBack = () => router.replace("/(app)/(tabs)/accounts");

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

  const account = findAccountById(accounts, id);

  if (!account) {
    // Estado not-found (specs/mobile/routes/stack/account-detail.md §"Estados"):
    // id não encontrado na lista já buscada de `accounts(familyId)`.
    return (
      <EmptyState
        title="Não achamos essa conta"
        description="Ela pode não estar mais disponível ou você não tem acesso a ela."
        actionLabel="Voltar para Contas"
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
        {account.name}
      </Text>
      <Text
        style={[
          typeScale.caption,
          { color: tokens.text.secondary, marginTop: space[1] },
        ]}
      >
        {account.institutionName}
      </Text>

      <View style={{ marginTop: space[4] }}>
        <Amount value={account.balance} variant="large" />
      </View>

      <View style={{ marginTop: space[6] }}>
        <Card padding="lg">
          <DetailRow
            label="Tipo"
            value={ACCOUNT_TYPE_LABEL[account.type] ?? account.type}
          />
          <DetailRow label="Moeda" value={account.currency} />
          <DetailRow
            label="Compartilhada com a família"
            value={account.sharedWithFamily ? "Sim" : "Não"}
          />
          <DetailRow
            label="Detalhe completo compartilhado"
            value={account.fullDetailShared ? "Sim" : "Não"}
            isLast
          />
        </Card>
      </View>

      <View style={{ marginTop: space[8] }}>
        <Button
          label="Configurar compartilhamento"
          onPress={() => router.push(`/sharing/account/${account.id}`)}
          variant="primary"
          fullWidth
        />
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
