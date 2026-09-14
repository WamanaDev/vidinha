import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { supabaseClient } from "@lib/supabaseClient";
import { theme } from "@config/theme";

// specs/mobile/routes/auth/forgot-password.md: sem código de referência
// completo no documento — segue a mesma estrutura/estilo de login.tsx.
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "vidinha",
  path: "auth/reset-password",
});

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = useCallback(async () => {
    if (!email) {
      setFieldError("Informe seu e-mail.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_URI,
      });
      if (error) {
        setFieldError("Não foi possível enviar o e-mail. Tente novamente.");
        return;
      }
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  }, [email]);

  if (emailSent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Vamos lá, e-mail a caminho!</Text>
        <Text style={styles.body}>
          Enviamos um link para {email}. Abra o e-mail e siga as instruções pra
          criar uma senha nova.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Voltar para o login
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Esqueceu sua senha?</Text>
      <Text style={styles.body}>
        Sem problema. Coloca seu e-mail aqui que a gente te manda um link pra
        criar uma senha nova.
      </Text>

      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="voce@exemplo.com"
        error={fieldError ?? undefined}
      />

      <Button
        label="Enviar link de recuperação"
        onPress={handleSendResetEmail}
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
  link: { alignSelf: "center", color: theme.colors.primary },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: theme.spacing.lg,
  },
});
