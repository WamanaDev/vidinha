# Login

**Rota:** `/(auth)/login` (`apps/mobile/app/(auth)/login.tsx`)

**Query/Mutation GraphQL:** nenhuma no NestJS; `supabase.auth.signInWithPassword` / `supabase.auth.signInWithOAuth`.

**Estados:** loading (submit), error (credenciais inválidas).

Redireciona para `/(auth)/mfa-challenge` (ver [`mfa-verification.md`](./mfa-verification.md)) quando `aal.nextLevel === 'aal2'`, ou para `/` (checa família) em caso de sucesso sem MFA.

## Código completo — `apps/mobile/app/(auth)/login.tsx`

```tsx
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Button } from '@components/Button';
import { TextInput } from '@components/TextInput';
import { supabaseClient } from '@lib/supabaseClient';
import { theme } from '@config/theme';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'vidinha', path: 'auth/callback' });

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = useCallback(async () => {
    if (!email || !password) {
      setFieldError('Informe e-mail e senha.');
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        setFieldError('E-mail ou senha inválidos.');
        return;
      }

      // 02-API-AUTH.md §1.7: aal1 -> exige segundo fator se MFA habilitado.
      const { data: aalData } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.nextLevel === 'aal2' && aalData.nextLevel !== aalData.currentLevel) {
        router.replace('/(auth)/mfa-challenge');
        return;
      }

      router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: REDIRECT_URI,
          skipBrowserRedirect: true,
          // PKCE é o flow padrão do supabase-js quando `flowType: 'pkce'`
          // está configurado no client (ver supabaseClient.ts).
        },
      });
      if (error || !data.url) {
        setFieldError('Não foi possível iniciar o login com Google.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);
      if (result.type !== 'success' || !result.url) {
        return; // usuário cancelou
      }

      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (!code) {
        setFieldError('Falha ao concluir login com Google.');
        return;
      }

      const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setFieldError('Falha ao concluir login com Google.');
        return;
      }

      router.replace('/');
    } finally {
      setGoogleLoading(false);
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('@assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Entrar no Vidinha</Text>

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

      <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
        Esqueci minha senha
      </Link>

      <Button label="Entrar" onPress={handleEmailLogin} loading={loading} fullWidth />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <Button
        label="Continuar com Google"
        variant="secondary"
        onPress={handleGoogleLogin}
        loading={googleLoading}
        fullWidth
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta?</Text>
        <Link href="/(auth)/sign-up">Cadastre-se</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.background },
  logo: { width: 96, height: 96, alignSelf: 'center', marginBottom: theme.spacing.lg },
  title: { fontSize: theme.typography.h1, fontWeight: '700', textAlign: 'center', marginBottom: theme.spacing.lg, color: theme.colors.text },
  forgotLink: { alignSelf: 'flex-end', marginBottom: theme.spacing.md, color: theme.colors.primary },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { marginHorizontal: theme.spacing.sm, color: theme.colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: theme.spacing.lg },
  footerText: { color: theme.colors.textMuted },
});
```
