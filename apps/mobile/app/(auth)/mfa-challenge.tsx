import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { supabaseClient } from "@lib/supabaseClient";
import { theme } from "@config/theme";

// specs/mobile/routes/auth/mfa-verification.md não fazia parte do escopo lido
// originalmente — implementado agora seguindo estrutura/estilo de login.tsx.
// Usa o primeiro fator TOTP verificado do usuário (00-DECISIONS.md não
// detalha múltiplos fatores simultâneos) e `challengeAndVerify` para
// completar o desafio em uma única chamada (02-API-AUTH.md §1.7).
export default function MfaChallengeScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFactors, setLoadingFactors] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.mfa.listFactors().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data?.totp?.[0]) {
        setFieldError(
          "Não encontramos um fator de verificação ativo. Tente entrar novamente.",
        );
      } else {
        setFactorId(data.totp[0].id);
      }
      setLoadingFactors(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleVerify = useCallback(async () => {
    if (!factorId) {
      return;
    }
    if (!code) {
      setFieldError("Informe o código de verificação.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) {
        setFieldError("Código inválido. Confira e tente de novo.");
        return;
      }
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [factorId, code, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificação em duas etapas</Text>
      <Text style={styles.body}>
        Digite o código gerado pelo seu aplicativo autenticador pra confirmar
        que é você mesmo.
      </Text>

      <TextInput
        label="Código de verificação"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        error={fieldError ?? undefined}
      />

      <Button
        label="Verificar"
        onPress={handleVerify}
        loading={loading || loadingFactors}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography.h1,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    color: theme.colors.text,
  },
  body: {
    textAlign: "center",
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
});
