import type { ExpoConfig, ConfigContext } from "expo/config";

// Lê variáveis de apps/mobile/.env (local, git-ignored). Ver .env.example.
// Nenhum segredo real deve entrar aqui — apenas valores públicos (EXPO_PUBLIC_*)
// e os pins de SSL, que não são segredo (são hashes públicos da chave do servidor).
const SSL_PIN_PRIMARY = process.env.SSL_PIN_PRIMARY ?? "";
const SSL_PIN_BACKUP = process.env.SSL_PIN_BACKUP ?? "";
const API_HOSTNAME = (() => {
  try {
    return new URL(process.env.EXPO_PUBLIC_API_URL ?? "").hostname;
  } catch {
    return "";
  }
})();

// 00-DECISIONS.md §6 — SSL Pinning é decisão obrigatória de MVP (pinning de
// chave pública, 2 pins ativos: atual + backup). O plugin exige EAS Dev Client
// (não roda no Expo Go). Ainda NÃO temos os pins reais nem domínio de produção
// (backend não provisionado), então o plugin só é incluído quando as duas
// variáveis de ambiente (SSL_PIN_PRIMARY / SSL_PIN_BACKUP) e o domínio da API
// estiverem preenchidos — isso mantém a infraestrutura pronta e o build
// funcionando em desenvolvimento local, sem quebrar por falta de segredo que
// ainda não existe. ANTES do primeiro build de produção via EAS, preencher
// SSL_PIN_PRIMARY / SSL_PIN_BACKUP (hashes SPKI reais do certificado do
// backend) nas env vars do projeto EAS — sem isso, o app de produção
// **não terá pinning ativo**, o que viola a decisão de arquitetura.
const sslPinningPlugin: [string, Record<string, unknown>] | null =
  SSL_PIN_PRIMARY && SSL_PIN_BACKUP && API_HOSTNAME
    ? [
        "react-native-ssl-public-key-pinning",
        {
          domains: [
            {
              pattern: API_HOSTNAME,
              includeSubdomains: true,
              publicKeyHashes: [SSL_PIN_PRIMARY, SSL_PIN_BACKUP],
            },
          ],
        },
      ]
    : null;

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
    // Ver comentário acima de `sslPinningPlugin`: entra na lista só quando os
    // pins reais + domínio da API estiverem configurados via env var.
    ...(sslPinningPlugin ? [sslPinningPlugin] : []),
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
