import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, Link } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { supabaseClient } from "@lib/supabaseClient";
import { theme } from "@config/theme";

// SUPOSIÇÃO: specs/mobile/routes/auth/reset-password.md não tem código de
// referência completo. O usuário chega aqui pelo link enviado por
// resetPasswordForEmail() (forgot-password.tsx), que deveria abrir o app via
// deep link (`vidinha://auth/reset-password`) já com uma sessão de
// recovery ativa (evento PASSWORD_RECOVERY do supabase-js). Porém o app
// atualmente NÃO trata deep links de auth em lugar nenhum — não há listener
// de `Linking` nem tratamento do evento `PASSWORD_RECOVERY` em
// authContext.tsx/supabaseClient.ts, e `detectSessionInUrl` está desligado
// no client (ver supabaseClient.ts). Ou seja: hoje, ao abrir o link do
// e-mail, o Supabase provavelmente não estabelece sessão automaticamente
// dentro do app — isso precisa ser resolvido separadamente (linking config +
// tratamento do token da URL) antes desse fluxo funcionar de ponta a ponta.
// Aqui apenas chamamos updateUser() assumindo que uma sessão de recovery já
// esteja ativa, seguindo o padrão de estilo/estrutura de login.tsx.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = useCallback(async () => {
    if (!password || !confirmPassword) {
      setFieldError("Preencha os dois campos de senha.");
      return;
    }
    if (password.length < 8) {
      setFieldError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("As senhas não conferem.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) {
        setFieldError(
          "Não foi possível redefinir sua senha. Peça um novo link e tente de novo.",
        );
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword]);

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Prontinho!</Text>
        <Text style={styles.body}>
          Sua senha foi redefinida. Agora é só entrar de novo com a senha nova.
        </Text>
        <Button
          label="Ir para o login"
          onPress={() => router.replace("/(auth)/login")}
          fullWidth
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar nova senha</Text>
      <Text style={styles.body}>Escolha uma senha nova para sua conta.</Text>

      <TextInput
        label="Nova senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        label="Confirmar nova senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={fieldError ?? undefined}
      />

      <Button
        label="Redefinir senha"
        onPress={handleResetPassword}
        loading={loading}
        fullWidth
      />

      <View style={styles.footer}>
        <Link href="/(auth)/login">Voltar para o login</Link>
      </View>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: theme.spacing.lg,
  },
});
