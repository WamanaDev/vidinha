# Observabilidade Prática (Sentry)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).

## 1. Backend (NestJS)

- Instalar `@sentry/node` e `@sentry/nestjs` (ou `@sentry/node` com filtro global de exceções do NestJS).
- Inicializar o SDK o mais cedo possível no bootstrap da função serverless (antes de `NestFactory.create`), com `dsn: SENTRY_DSN_BACKEND` e `environment: NODE_ENV`.
- Registrar um **global exception filter** do NestJS que captura exceções não tratadas e as envia ao Sentry antes de devolver ao cliente uma resposta GraphQL genérica (sem stack trace, conforme seção 31 do `claude.md`). Ver o filtro completo em [`../security/error-handling.md`](../security/error-handling.md).
- Adicionar contexto por requisição (sem dados sensíveis): `familyId` (não `userId` puro sem necessidade), nome da operação GraphQL, ambiente. Nunca anexar tokens, senhas, ou payload bruto de conexão Pluggy.
- Amostragem de performance (`tracesSampleRate`) baixa em produção (ex.: 0.1) para não estourar cota do plano free; 1.0 em staging para depuração completa.

**Eventos que devem gerar alerta (Sentry Alert Rules):**
- Qualquer exceção não tratada em resolver de mutation financeira (criação/edição de conta, transação, compartilhamento).
- Falha de validação de assinatura JWT recorrente (possível ataque ou problema de configuração JWKS).
- Falha de comunicação com Pluggy (timeout, 5xx) acima de um limiar (ex.: 5 ocorrências em 10 minutos).
- Falha na aplicação de migração (`prisma migrate deploy`) no workflow de deploy — via notificação do próprio GitHub Actions (job failure), não apenas Sentry.
- Erro no job de backup semanal (`backup-postgres.yml` falhando) — idem, alerta via GitHub Actions (e-mail/Slack webhook opcional).

## 2. Mobile (Expo/React Native)

- Instalar `@sentry/react-native` com o plugin de configuração do Expo (`sentry-expo` foi descontinuado; usar o pacote oficial `@sentry/react-native` com `npx sentry-expo-upload-sourcemaps` ou o plugin equivalente atual para upload de source maps nos builds EAS).
- Configurar `dsn: EXPO_PUBLIC_SENTRY_DSN_MOBILE`, `environment` (development/staging/production) e `release`/`dist` atrelados ao `runtimeVersion`/build number do EAS, para correlacionar erros a uma build específica.
- Habilitar captura de:
  - Erros JS não tratados (automático).
  - Falhas de rede para a API GraphQL (status HTTP, sem corpo de resposta sensível).
  - **Falhas de SSL Pinning** — evento customizado de alta prioridade (`captureMessage` com nível `error`), já que indica possível ataque MITM ou necessidade de rotação de pin emergencial.
- Não capturar: conteúdo de formulários financeiros, tokens, dados do Pluggy Connect (o SDK do Sentry deve ter `beforeSend` filtrando esses campos por segurança).

**Eventos que devem gerar alerta:**
- Qualquer falha de SSL Pinning reportada por mais de um dispositivo/usuário em curto intervalo (possível problema de rotação de certificado real, não ataque).
- Taxa de crash acima de um limiar por versão de build (ex.: crash-free rate abaixo de 99% em uma release).
- Erros de autenticação recorrentes (ex.: falha ao renovar refresh token) que possam indicar bug de sessão generalizado.
