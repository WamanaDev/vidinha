import type { ExpoConfig, ConfigContext } from "expo/config";

// Lê variáveis de apps/mobile/.env (local, git-ignored). Ver .env.example.
// Nenhum segredo real deve entrar aqui — apenas valores públicos (EXPO_PUBLIC_*)
// e os pins de SSL, que não são segredo (são hashes públicos da chave do servidor).
const SSL_PIN_PRIMARY = process.env.SSL_PIN_PRIMARY ?? "";
const SSL_PIN_BACKUP = process.env.SSL_PIN_BACKUP ?? "";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Vidinha",
  slug: "vidinha",
  scheme: "vidinha", // 00-overview.md Suposição #4: vidinha://auth/callback
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic", // specs/design/00-overview.md Suposição #5 — sem toggle de tema próprio
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FAF7F2", // tokens/colors.md bg.app (light) — nunca branco puro
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.vidinha.app",
  },
  android: {
    package: "com.vidinha.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FAF7F2",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FAF7F2",
      },
    ],
    // TODO (00-DECISIONS.md §6): plugin de SSL pinning (ex.:
    // 'react-native-ssl-public-key-pinning') exige EAS Dev Client custom e os
    // pins reais do backend (SSL_PIN_PRIMARY / SSL_PIN_BACKUP acima), que ainda
    // não existem porque a API/infra de produção não foi provisionada. Ativar
    // este plugin assim que houver domínio + certificado reais.
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
    sentryDsnMobile: process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE ?? "",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    sslPinPrimary: SSL_PIN_PRIMARY,
    sslPinBackup: SSL_PIN_BACKUP,
    eas: {
      projectId: "",
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
