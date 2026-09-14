import { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, Link } from "expo-router";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";
import { supabaseClient } from "@lib/supabaseClient";
import { useCompleteUserProfile } from "@features/auth/hooks/useCompleteUserProfile";
import { theme } from "@config/theme";

// specs/mobile/routes/auth/signup.md: sem código de referência completo no
// documento original — segue a estrutura de login.md (mesmos componentes de
// design system, mesmo tratamento de loading/error). Fluxo pós-cadastro:
// specs/mobile/navigation.md `SignUp -->|confirma e-mail + completeUserProfile| CheckFamily`.
export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const { mutateAsync: completeProfile } = useCompleteUserProfile();

  const handleSignUp = useCallback(async () => {
    if (!displayName.trim() || !email || !password) {
      setFieldError("Preencha nome, e-mail e senha.");
      return;
    }
    if (password.length < 8) {
      setFieldError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });
      if (error) {
        setFieldError(
          error.message.toLowerCase().includes("already")
            ? "Esse e-mail já está cadastrado."
            : "Não foi possível concluir o cadastro. Tente novamente.",
        );
        return;
      }

      // Sem sessão imediata: o Supabase exige confirmação de e-mail antes do
      // primeiro login (comportamento padrão do projeto).
      if (!data.session) {
        setConfirmationPending(true);
        return;
      }

      await completeProfile(displayName.trim());
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [completeProfile, displayName, email, password, router]);

  if (confirmationPending) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Confirme seu e-mail</Text>
        <Text style={styles.body}>
          Enviamos um link de confirmação para {email}. Depois de confirmar,
          volte aqui e entre com sua senha.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Voltar para o login
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar conta no Vidinha</Text>

      <TextInput
        label="Nome"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Como podemos te chamar?"
      />
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="voce@exemplo.com"
      />
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={fieldError ?? undefined}
      />

      <Button
        label="Criar conta"
        onPress={handleSignUp}
        loading={loading}
        fullWidth
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem conta?</Text>
        <Link href="/(auth)/login">Entrar</Link>
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
  footerText: { color: theme.colors.textMuted },
});
