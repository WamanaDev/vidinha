import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { Skeleton } from "@components/Skeleton";
import { ErrorState } from "@components/ErrorState";
import { useMe } from "@features/settings/hooks/useMe";
import { useAuth } from "@lib/authContext";
import { supabaseClient } from "@lib/supabaseClient";
import { useTokens } from "@config/theme";
import { type as typeScale } from "@config/theme/typography";
import { space } from "@config/theme/spacing";
import type { GraphQLApiError } from "@lib/graphqlClient";

// specs/mobile/routes/stack/settings/security-mfa.md — rota
// `/(app)/settings/security`. Status via `me.mfaEnabled` (SDL real).
//
// SUPOSIÇÃO: o enrollment completo de TOTP via Supabase Auth MFA
// (`supabase.auth.mfa.enroll/challenge/verify`, exibição de QR code, input do
// código de 6 dígitos) não está descrito em nenhuma spec de mobile com código
// pronto (security-mfa.md só cita os métodos do SDK, sem fluxo de tela).
// Implementado aqui de forma conservadora: chamamos `mfa.enroll()` só para
// confirmar que a API está disponível/o usuário pode iniciar o fluxo, mas a
// tela não implementa o QR code + verificação (fora do escopo desta tarefa) —
// mostramos feedback "em breve" em vez de deixar o usuário num fluxo
// incompleto. Quando o fluxo completo for especificado, substituir por
// `MfaEnrollFlow` (specs/mobile/00-overview.md, `settings/components/`).
export default function SecurityScreen() {
  const router = useRouter();
  const tokens = useTokens();
  const { data, isLoading, isError, error, refetch } = useMe();
  const { signOut } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);

  const handleEnableMfa = useCallback(async () => {
    setEnrolling(true);
    setEnrollMessage(null);
    try {
      const { error: enrollError } = await supabaseClient.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError) {
        setEnrollMessage(
          "Não conseguimos iniciar a ativação agora. Tente de novo em instantes.",
        );
        return;
      }
      // SUPOSIÇÃO: sem tela de QR code/verificação implementada ainda, só
      // avisamos que o recurso está a caminho.
      setEnrollMessage(
        "Ativação de autenticação em dois fatores chegando em breve por aqui.",
      );
    } finally {
      setEnrolling(false);
    }
  }, []);

  const handleSignOutGlobal = useCallback(async () => {
    await signOut();
    router.replace("/(auth)/login");
  }, [router, signOut]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: tokens.bg.app, padding: space[4] },
        ]}
      >
        <Skeleton width="100%" height={52} borderRadius={12} count={2} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        description={(error as GraphQLApiError)?.message}
        errorCode={(error as GraphQLApiError)?.code}
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg.app }]}>
      <Text style={[typeScale.h1, { color: tokens.text.primary }]}>
        Segurança
      </Text>

      <View style={{ marginTop: space[6], gap: space[2] }}>
        <Text style={[typeScale.label, { color: tokens.text.secondary }]}>
          Autenticação em dois fatores
        </Text>
        {/* SUPOSIÇÃO: specs/mobile/design-system/badge.md define um `Badge`,
        mas o componente ainda não foi implementado em src/components/ — fora
        do escopo desta tarefa (telas de onboarding/settings). Usamos texto
        simples com as cores de estado já existentes em vez de inventar
        estilo novo. */}
        <Text
          style={[
            typeScale.body,
            {
              color: data.me.mfaEnabled
                ? tokens.state.success.fg
                : tokens.text.secondary,
            },
          ]}
        >
          {data.me.mfaEnabled ? "Ativada" : "Desativada"}
        </Text>
      </View>

      {!data.me.mfaEnabled ? (
        <View style={{ marginTop: space[4] }}>
          <Button
            label="Ativar autenticação em dois fatores"
            onPress={handleEnableMfa}
            loading={enrolling}
            variant="secondary"
            fullWidth
          />
          {enrollMessage ? (
            <Text
              style={[
                typeScale.caption,
                { color: tokens.text.secondary, marginTop: space[2] },
              ]}
            >
              {enrollMessage}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginTop: space[8] }}>
        <Button
          label="Sair de todos os dispositivos"
          onPress={handleSignOutGlobal}
          variant="destructive"
          fullWidth
        />
      </View>
    </View>
  );
}

// `useAuth()` (@lib/authContext.tsx) já faz `signOut({ scope: 'global' })`
// internamente (ver comentário em authContext.tsx) — o botão "Sair de todos
// os dispositivos" aqui dispara exatamente esse logout global
// (specs/mobile/routes/stack/settings/security-mfa.md).

const styles = StyleSheet.create({
  container: { flex: 1, padding: space[5] },
});
