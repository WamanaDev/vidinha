# Checklist OWASP MASVS aplicado ao app mobile (Expo/React Native)

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

## MASVS-STORAGE

| # | Requisito concreto | Prioridade |
|---|---|---|
| ST1 | Access token, refresh token e qualquer credencial/segredo **somente** em `expo-secure-store` — nunca `AsyncStorage`, `MMKV` sem criptografia, ou variáveis em memória persistidas em disco por engano. | MVP |
| ST2 | Cache local de dados financeiros (ex.: últimas transações para uso offline) armazenado apenas se necessário para UX, com TTL curto e nunca incluindo tokens; avaliar `expo-sqlite` com criptografia (`SQLCipher`) se cache persistente for introduzido. | Pós-MVP |
| ST3 | Nenhum dado sensível em logs de console em build de produção (`console.log` de payload de transação/token é proibido; usar logger com nível controlado por env). | MVP |
| ST4 | Screenshots/App Switcher: considerar blur/hide de tela em telas com saldo/transações ao app ir para background (iOS `UIScreen` privacy screen via config plugin). | Pós-MVP |

## MASVS-CRYPTO

| # | Requisito concreto | Prioridade |
|---|---|---|
| CR1 | Toda comunicação de rede via HTTPS/TLS 1.2+; nenhuma chamada `http://` mesmo em desenvolvimento apontando para ambiente real. | MVP |
| CR2 | Certificate/Public-Key Pinning: pinning de **chave pública**, com **2 pins ativos simultaneamente** (atual + próximo) e **1 backup pin de emergência**, via config plugin (`react-native-ssl-public-key-pinning`) — requer **EAS Build com Dev Client customizado** (não roda em Expo Go), conforme 00-DECISIONS §6. | MVP |
| CR3 | Rotação de pin: novo pin adicionado ao app com no mínimo 60 dias de antecedência da troca de certificado do backend; falha de pinning bloqueia chamadas de rede com erro claro e força atualização via EAS Update/loja. | MVP |
| CR4 | Nenhuma criptografia customizada implementada à mão (ex.: nunca "inventar" cifra); usar apenas APIs nativas/expo (`expo-crypto`) quando necessário. | MVP |

## MASVS-AUTH

| # | Requisito concreto | Prioridade |
|---|---|---|
| AU1 | Login via Supabase Auth SDK (email/senha, Google, Apple Sign-In obrigatório quando há login social — exigência da App Store). | MVP |
| AU2 | Fluxos OAuth usam Expo `AuthSession` com **PKCE**; nenhum client secret embutido no app mobile. | MVP |
| AU3 | Biometria local (Face ID/Touch ID via `expo-local-authentication`) como camada adicional opcional para reabrir o app/desbloquear visualização de saldos, sem substituir a autenticação do backend. | Pós-MVP |
| AU4 | MFA TOTP: app deve suportar enrollment e desafio de TOTP do Supabase Auth (fluxo opcional no MVP, conforme 00-DECISIONS §5). | MVP |

## MASVS-NETWORK

| # | Requisito concreto | Prioridade |
|---|---|---|
| N1 | Todas as chamadas GraphQL/REST do app apontam para domínio HTTPS validado por pinning (ver CR2). | MVP |
| N2 | Nenhum tráfego de debug/proxy (Flipper, Reactotron) habilitado em build de produção/release. | MVP |
| N3 | Config de rede não permite `cleartext traffic` no Android (`usesCleartextTraffic: false` no manifest gerado pelo Expo). | MVP |

## MASVS-RESILIENCE

| # | Requisito concreto | Prioridade |
|---|---|---|
| R1 | **Hermes** habilitado (padrão Expo/RN) para bytecode em vez de JS legível. | MVP |
| R2 | **ProGuard/R8** habilitado no build Android release; strip de símbolos de debug no build iOS. JS bundle minificado pelo Metro em produção. Conforme 00-DECISIONS §6. | MVP |
| R3 | Detecção básica de root/jailbreak (ex. `expo-device` + heurísticas, ou lib dedicada) usada apenas para **alertar/telemetria** (Sentry) — não bloquear uso no MVP, dado o público-alvo consumidor; reavaliar bloqueio ativo em v2 se houver sinal de fraude. | Pós-MVP |
| R4 | Segredos de build (ex.: chave pública de pinning) versionados apenas em arquivo de config do EAS (`eas.json`/config plugin), nunca hardcoded em múltiplos lugares do código-fonte. | MVP |
