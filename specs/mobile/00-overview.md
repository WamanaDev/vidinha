# Vidinha — App Mobile (Expo Router + Feature Architecture) — Overview

**Status:** Especificação técnica derivada de `claude.md` (seções 13, 15, 16, 34, 51-53), `00-DECISIONS.md` e `02-API-AUTH.md`.
**Objetivo:** Permitir que outro agente implemente o app inteiro (estrutura, rotas, componentes, chamadas GraphQL) sem precisar adivinhar nada.

Este documento não contradiz `00-DECISIONS.md` nem os nomes de campos/queries/mutations de `02-API-AUTH.md`. Onde algo não estava coberto, foi assumido e listado em **"Suposições desta spec"** ao final.

> Este arquivo é o índice desta pasta. Conteúdo completo original em `specs/05-MOBILE-APP-SPEC.md` (agora só um ponteiro) foi reestruturado aqui:
> - Diagrama de navegação: [`navigation.md`](./navigation.md)
> - Design system de componentes: [`design-system/`](./design-system/) (um arquivo por componente)
> - Rotas/telas: [`routes/`](./routes/) (subpastas `auth/`, `onboarding/`, `tabs/`, `stack/`, `stack/settings/`)
> - Infra transversal com código completo: [`lib/secure-storage.md`](./lib/secure-storage.md), [`lib/graphql-client.md`](./lib/graphql-client.md)

---

## 1. Estrutura de pastas completa

> **Nota de monorepo (`00-DECISIONS.md` §11, `specs/infra/git-workflow.md` §1):** o Vidinha é um monorepo pnpm workspaces (`apps/api`, `apps/mobile`, `packages/*`). Toda a árvore abaixo é relativa a `apps/mobile/` — ou seja, `app/(auth)/login.tsx` desta spec corresponde a `apps/mobile/app/(auth)/login.tsx` no disco, e `src/lib/graphqlClient.ts` corresponde a `apps/mobile/src/lib/graphqlClient.ts`. Isso é só um ajuste mecânico de caminho: os nomes de rotas do Expo Router (o que aparece dentro de `app/`) não mudam.

Expo Router (file-based routing) para **rotas/telas**, combinado com **arquitetura por feature** (`claude.md` §13) para **lógica de domínio/UI reutilizável**. Regra geral: arquivos em `app/` são finos — apenas compõem componentes/hooks importados de `src/features/*` via path aliases (`claude.md` §15).

```text
apps/mobile/                              # raiz do app dentro do monorepo (pnpm workspace "mobile")
├── app/                                  # Expo Router — SOMENTE rotas (finas, sem lógica de negócio)
│   ├── _layout.tsx                       # Root layout: providers globais (QueryClient, AuthProvider, Toast)
│   ├── +not-found.tsx
│   ├── +html.tsx                         # (web, se aplicável)
│   ├── index.tsx                         # Splash / bootstrap: decide destino inicial
│   │
│   ├── (auth)/                           # Grupo público — sem sessão válida
│   │   ├── _layout.tsx                   # Stack; redireciona para (app) se já autenticado
│   │   ├── login.tsx
│   │   ├── sign-up.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── mfa-challenge.tsx             # Verificação MFA (TOTP) pós sign-in
│   │
│   ├── (onboarding)/                     # Grupo autenticado, sem família ativa
│   │   ├── _layout.tsx                   # Guard: exige sessão; redireciona para (app) se já tem família
│   │   ├── welcome.tsx                   # Escolha: criar família OU entrar com convite
│   │   ├── create-family.tsx
│   │   ├── join-family.tsx               # Inserir/colar token de convite
│   │   └── invite-members.tsx            # Convidar membros logo após criar a família
│   │
│   ├── (app)/                            # Grupo protegido — sessão válida + família ativa obrigatória
│   │   ├── _layout.tsx                   # Guard de sessão (ver navigation.md) + provider de família ativa
│   │   │
│   │   ├── (tabs)/                       # Bottom tabs principais
│   │   │   ├── _layout.tsx               # <Tabs> do Expo Router
│   │   │   ├── index.tsx                 # Início / Dashboard consolidado
│   │   │   ├── accounts.tsx              # Contas
│   │   │   ├── cards.tsx                 # Cartões
│   │   │   ├── transactions.tsx          # Lançamentos / Transações
│   │   │   └── family.tsx                # Família (resumo + atalho para gestão)
│   │   │
│   │   ├── account/
│   │   │   └── [id].tsx                  # Detalhe de conta
│   │   ├── card/
│   │   │   └── [id].tsx                  # Detalhe de cartão
│   │   ├── transaction/
│   │   │   └── [id].tsx                  # Detalhe de transação (inclui ocultar/editar categoria)
│   │   │
│   │   ├── open-finance/
│   │   │   ├── connect.tsx               # Conectar via Pluggy Connect (modal/full-screen webview)
│   │   │   └── connections.tsx           # Lista de conexões / revogar
│   │   │
│   │   ├── sharing/
│   │   │   ├── index.tsx                 # Visão geral de compartilhamento (contas/cartões/categorias)
│   │   │   ├── account/[id].tsx          # Configurar compartilhamento de 1 conta
│   │   │   ├── card/[id].tsx             # Configurar compartilhamento de 1 cartão
│   │   │   └── category/[id].tsx         # Configurar compartilhamento de 1 categoria
│   │   │
│   │   ├── family-management/
│   │   │   ├── members.tsx               # Gerenciar membros
│   │   │   ├── invite.tsx                # Convidar novo membro
│   │   │   └── member/[membershipId].tsx # Detalhe do membro: promover/remover
│   │   │
│   │   ├── recurring-expenses/
│   │   │   ├── index.tsx                 # Listar contas recorrentes
│   │   │   ├── new.tsx                   # Criar
│   │   │   └── [id]/edit.tsx             # Editar
│   │   │
│   │   ├── categories/
│   │   │   ├── index.tsx                 # Listar categorias
│   │   │   ├── new.tsx
│   │   │   └── [id]/edit.tsx
│   │   │
│   │   └── settings/
│   │       ├── index.tsx                 # Menu de configurações
│   │       ├── profile.tsx               # Editar perfil (displayName, avatar)
│   │       ├── security.tsx              # MFA (enroll/disable), sessões, logout global
│   │       ├── export-data.tsx           # exportMyData
│   │       ├── delete-account.tsx        # requestAccountDeletion
│   │       └── notifications.tsx         # Preferências de notificação
│   │
│   └── (modals)/                         # Telas modais globais (presentation: 'modal')
│       ├── _layout.tsx
│       ├── create-family-modal.tsx       # (se acionado a partir de dentro do app, não onboarding)
│       └── image-viewer.tsx
│
├── src/
│   ├── features/                         # claude.md §13 — um diretório por domínio
│   │   ├── auth/
│   │   │   ├── components/               # LoginForm, SignUpForm, SocialLoginButtons, MfaCodeInput
│   │   │   ├── hooks/                    # useLogin, useSignUp, useOAuthLogin, useMfaChallenge
│   │   │   ├── services/                 # supabaseAuth.ts (wrappers do supabase-js)
│   │   │   └── types.ts
│   │   │
│   │   ├── family/
│   │   │   ├── components/               # FamilySwitcher, MemberListItem, InviteCard, RoleBadge
│   │   │   ├── hooks/                    # useMyFamilies, useCreateFamily, useAcceptInvite,
│   │   │   │                             # useInviteMember, usePromoteMember, useRemoveMember, useLeaveFamily
│   │   │   ├── services/                 # family.graphql.ts (documents GraphQL)
│   │   │   └── types.ts
│   │   │
│   │   ├── open-finance/
│   │   │   ├── components/               # PluggyConnectWidget, ConnectionCard, ConnectionStatusBadge
│   │   │   ├── hooks/                    # usePluggyConnectToken, useOpenFinanceConnections,
│   │   │   │                             # useCreateConnection, useSyncConnection, useRevokeConnection
│   │   │   ├── services/                 # openFinance.graphql.ts, pluggyConnectSdk.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── accounts/
│   │   │   ├── components/               # AccountCard, AccountBalance, AccountTypeIcon
│   │   │   ├── hooks/                    # useAccounts, useAccount, useUpdateAccountSharing
│   │   │   ├── services/                 # accounts.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── cards/
│   │   │   ├── components/               # CardTile, CardInvoiceProgress
│   │   │   ├── hooks/                    # useCards, useCard, useUpdateCardSharing
│   │   │   ├── services/                 # cards.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── components/               # TransactionListItem, TransactionFilterSheet, HideTransactionSwitch
│   │   │   ├── hooks/                    # useTransactions (paginado), useTransaction,
│   │   │   │                             # useHideTransaction, useUpdateTransactionCategory
│   │   │   ├── services/                 # transactions.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── sharing/
│   │   │   ├── components/               # SharingPermissionRow, SharingScopeToggle, FullDetailToggle
│   │   │   ├── hooks/                    # useSharingPermissions, useUpdateSharingPermission
│   │   │   ├── services/                 # sharing.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── recurring-expenses/
│   │   │   ├── components/               # RecurringExpenseListItem, FrequencyPicker
│   │   │   ├── hooks/                    # useRecurringExpenses, useCreateRecurringExpense,
│   │   │   │                             # useUpdateRecurringExpense, useDeleteRecurringExpense
│   │   │   ├── services/                 # recurringExpenses.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── categories/
│   │   │   ├── components/               # CategoryListItem, CategoryIconPicker
│   │   │   ├── hooks/                    # useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory
│   │   │   ├── services/                 # categories.graphql.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/               # ConsolidatedSummaryCard, CategoryBreakdownChart, UpcomingBillsList
│   │   │   ├── hooks/                    # useDashboardSummary (compõe accounts+transactions+recurring)
│   │   │   └── types.ts
│   │   │
│   │   └── settings/
│   │       ├── components/               # ProfileForm, MfaEnrollFlow, DangerZoneSection
│   │       ├── hooks/                    # useMe, useCompleteUserProfile, useExportMyData,
│   │       │                             # useRequestAccountDeletion, useMfaEnrollment
│   │       ├── services/                 # user.graphql.ts
│   │       └── types.ts
│   │
│   ├── components/                       # Design system compartilhado (ver design-system/) — sem lógica de domínio
│   │   ├── Button/
│   │   ├── TextInput/
│   │   ├── Card/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── EmptyState/
│   │   ├── ErrorState/
│   │   ├── Skeleton/
│   │   ├── BottomSheet/
│   │   ├── ListItem/
│   │   ├── Amount/
│   │   ├── ProgressRing/
│   │   └── index.ts                      # barrel export
│   │
│   ├── lib/                              # Infraestrutura transversal (não é feature)
│   │   ├── secureStorage.ts              # wrapper Expo SecureStore (ver lib/secure-storage.md)
│   │   ├── graphqlClient.ts              # cliente GraphQL + injeção de JWT (ver lib/graphql-client.md)
│   │   ├── supabaseClient.ts             # instância única do supabase-js
│   │   ├── authContext.tsx               # AuthProvider (sessão Supabase) + useAuth()
│   │   ├── activeFamilyContext.tsx       # contexto de família ativa (familyId selecionado)
│   │   ├── queryClient.ts                # instância TanStack QueryClient + config default
│   │   ├── errorMapping.ts               # mapeia ErrorCode (02-API-AUTH.md §4.2) -> mensagens PT-BR
│   │   └── analytics.ts                  # (placeholder Sentry breadcrumbs)
│   │
│   ├── stores/                           # Zustand — estado de UI local (ver §3 abaixo)
│   │   ├── onboardingStore.ts            # wizard multi-step de onboarding
│   │   ├── transactionFilterStore.ts     # filtros ativos da tela de transações
│   │   └── uiStore.ts                    # bottom sheets globais, toasts
│   │
│   ├── config/
│   │   ├── env.ts                        # leitura tipada de EXPO_PUBLIC_* / app.config
│   │   ├── theme.ts                      # tokens de design (cor, espaçamento, tipografia)
│   │   └── constants.ts                  # PAGE_SIZE, DEEP_LINK_SCHEME, etc.
│   │
│   └── types/
│       └── graphql-generated.ts          # re-exporta os tipos do workspace package @vidinha/graphql-types
│                                         # (gerados por GraphQL Code Generator a partir de packages/graphql-schema/
│                                         # schema.graphql — fonte única, ver 00-DECISIONS.md §11); mantido como
│                                         # ponto único de import (@types/*) para não reescrever os `import type`
│                                         # já usados nas telas desta spec.
│
├── assets/
│   ├── fonts/
│   ├── images/
│   └── lottie/
│
├── app.config.ts                         # Expo config deste workspace (inclui plugin de SSL pinning — ver 00-DECISIONS.md §6)
├── babel.config.js                       # module-resolver para path aliases (local a apps/mobile)
├── tsconfig.json                         # estende packages/config/tsconfig.base.json; paths (ver §1.1 abaixo)
├── metro.config.js
├── eas.json                              # config do EAS Build/Update — fica em apps/mobile (ver nota de CLI em §1.2)
├── codegen.yml                           # GraphQL Code Generator — schema fonte: packages/graphql-schema/schema.graphql
└── package.json                          # package.json do workspace "mobile" (não da raiz do monorepo)
```

### 1.1 Path aliases (`claude.md` §15)

`apps/mobile/tsconfig.json` (estende a base compartilhada do monorepo, `00-DECISIONS.md` §11):

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["app/*"],
      "@features/*": ["src/features/*"],
      "@components/*": ["src/components/*"],
      "@components": ["src/components/index.ts"],
      "@lib/*": ["src/lib/*"],
      "@stores/*": ["src/stores/*"],
      "@config/*": ["src/config/*"],
      "@types/*": ["src/types/*"],
      "@assets/*": ["assets/*"]
    }
  }
}
```

`babel.config.js` (necessário porque Metro/Babel não lê `tsconfig.json` sozinho em runtime):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@app': './app',
            '@features': './src/features',
            '@components': './src/components',
            '@lib': './src/lib',
            '@stores': './src/stores',
            '@config': './src/config',
            '@types': './src/types',
            '@assets': './assets',
          },
        },
      ],
      'react-native-reanimated/plugin', // deve ser o último plugin
    ],
  };
};
```

### 1.2 Comandos via workspace pnpm

Como `apps/mobile` é um workspace pnpm dentro do monorepo (não a raiz do repositório), os comandos usuais do Expo/EAS devem ser executados a partir da raiz apontando para o workspace, ou com `cd` para dentro da pasta:

```bash
# a partir da raiz do monorepo
pnpm --filter mobile expo start
pnpm --filter mobile expo run:ios
pnpm -C apps/mobile expo start          # equivalente, usando -C

# ou entrando na pasta do app
cd apps/mobile && npx expo start
```

**Particularidade do EAS CLI:** a CLI do `eas-cli` não é ciente de pnpm workspaces (não resolve `--filter`), então builds/updates via EAS **devem ser executados a partir de `apps/mobile`**, com `eas.json` residindo nessa mesma pasta:

```bash
cd apps/mobile && eas build --profile development
cd apps/mobile && eas update
```

`pnpm -C apps/mobile eas build ...` também funciona (equivalente a `cd` + `eas build`), mas o ponto importante é que o `eas.json` e o contexto de execução do EAS ficam sempre em `apps/mobile`, nunca na raiz do monorepo.

---

## 2. Convenção de estados (loading/empty/error)

Toda tela que busca dados via `useQuery` trata **loading** (Skeleton), **empty** (`EmptyState`) e **error** (`ErrorState` com retry), conforme `02-API-AUTH.md` §4 (nunca expor `debugMessage`/stack ao usuário; usar `error.extensions.code` mapeado por `@lib/errorMapping.ts`). Cada arquivo em `routes/` documenta os estados específicos daquela tela.

Ver diagrama de navegação completo em [`navigation.md`](./navigation.md).

---

## 3. Gerenciamento de estado

### 3.1 Estado de servidor: **TanStack Query** (não Apollo Client)

**Justificativa**, à luz de `00-DECISIONS.md` §7:

- A API roda em **Vercel Serverless (Hobby)**, **sem GraphQL Subscriptions** — o principal diferencial do Apollo Client (cache normalizado reativo + subscriptions nativas) fica sem uso real no MVP.
- Apollo Client exige `InMemoryCache` com heurísticas de normalização por `id`/`__typename`; para o volume de telas deste app (listas paginadas simples, poucas relações profundas), isso é complexidade desnecessária.
- TanStack Query trata a API GraphQL como qualquer fetch assíncrono: `queryKey` explícita por operação + variáveis (ex.: `['transactions', familyId, filter, cursor]`), `useInfiniteQuery` cobre paginação cursor-based nativamente (mapeia 1:1 com `TransactionConnection.pageInfo`), `staleTime`/`gcTime` configuráveis por query, `onError` centralizado plugável no `errorMapping.ts`.
- Menor bundle e menor superfície de configuração no cliente GraphQL (usamos `graphql-request` puro como fetcher, não uma lib de cliente GraphQL completa) — alinhado a `claude.md` §17 (avaliar dependências antes de instalar; menos dependências transitivas).
- Retry/refetch em foco (`refetchOnWindowFocus`-equivalente do RN via `onAppStateChange`) cobre o caso de token renovado em background pelo Supabase SDK.

Bibliotecas: `@tanstack/react-query` + `graphql-request` (cliente HTTP fino, não engine de cache) + `graphql-codegen` para tipos.

### 3.2 Estado de UI local: **Zustand** (não Context API puro)

**Justificativa:**

- Formulários multi-step (onboarding: criar família → convidar membros; filtros de transações com múltiplos campos) precisam de estado que sobrevive a navegação entre telas do Expo Router sem prop-drilling nem re-render de toda a árvore (Context API re-renderiza todos os consumidores a cada mudança, mesmo os que só leem uma fatia).
- Zustand permite seletores granulares (`useOnboardingStore((s) => s.familyName)`), reduzindo re-renders — relevante para `claude.md` §16.3 (evitar renderizações desnecessárias).
- Sem boilerplate de Provider/Reducer; stores são módulos simples, testáveis isoladamente.
- Context API **continua sendo usado** para os dois casos onde é a ferramenta certa (dependência de ciclo de vida/autenticação, não estado de formulário): `AuthProvider` (sessão Supabase) e `ActiveFamilyProvider` (família selecionada) em `src/lib/`, porque esses são poucos consumidores e o valor muda raramente.

```typescript
// src/stores/onboardingStore.ts
import { create } from 'zustand';

interface OnboardingState {
  step: 'welcome' | 'create-family' | 'invite-members';
  familyName: string;
  inviteEmails: string[];
  setStep: (step: OnboardingState['step']) => void;
  setFamilyName: (name: string) => void;
  addInviteEmail: (email: string) => void;
  removeInviteEmail: (email: string) => void;
  reset: () => void;
}

const initialState = {
  step: 'welcome' as const,
  familyName: '',
  inviteEmails: [] as string[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setFamilyName: (familyName) => set({ familyName }),
  addInviteEmail: (email) =>
    set((s) => ({ inviteEmails: [...new Set([...s.inviteEmails, email])] })),
  removeInviteEmail: (email) =>
    set((s) => ({ inviteEmails: s.inviteEmails.filter((e) => e !== email) })),
  reset: () => set(initialState),
}));
```

### 3.3 Injeção de JWT e tratamento de expiração

O cliente GraphQL (`src/lib/graphqlClient.ts`, código completo em [`lib/graphql-client.md`](./lib/graphql-client.md)) obtém o `access_token` atual via `supabaseClient.auth.getSession()` **a cada requisição** (o SDK do Supabase já mantém o token renovado em memória/SecureStore via `autoRefreshToken: true`, então não há necessidade de cache próprio de token). Se o servidor responder `extensions.code === 'UNAUTHENTICATED'` (conforme `02-API-AUTH.md` §1.8 e §4.2), o client:

1. Chama `supabaseClient.auth.refreshSession()` uma única vez (evita loop infinito).
2. Se o refresh for bem-sucedido, repete a requisição original uma vez com o novo token.
3. Se o refresh falhar (refresh token também expirado/revogado), dispara `onSessionExpired()` do `AuthProvider`, que limpa o SecureStore e redireciona para `/(auth)/login` (`router.replace`).

Ver código completo de armazenamento seguro em [`lib/secure-storage.md`](./lib/secure-storage.md).

---

## 4. Design system de componentes

Todos em `src/components/<Nome>/index.tsx`, sem conhecimento de GraphQL/domínio. Interface de props e descrição de uso de cada um em [`design-system/`](./design-system/):

- [`button.md`](./design-system/button.md)
- [`text-input.md`](./design-system/text-input.md)
- [`card.md`](./design-system/card.md)
- [`avatar.md`](./design-system/avatar.md)
- [`badge.md`](./design-system/badge.md)
- [`empty-state.md`](./design-system/empty-state.md)
- [`error-state.md`](./design-system/error-state.md)
- [`skeleton.md`](./design-system/skeleton.md)
- [`bottom-sheet.md`](./design-system/bottom-sheet.md)
- [`list-item.md`](./design-system/list-item.md)
- [`amount.md`](./design-system/amount.md)
- [`progress-ring.md`](./design-system/progress-ring.md)

---

## 5. Rotas/telas

Lista completa em [`routes/`](./routes/), organizada por fluxo:

- `routes/auth/` — login, signup, forgot-password (inclui reset-password), mfa-verification
- `routes/onboarding/` — create-or-join-family, invite-members
- `routes/app-layout.md` — código completo do guard `(app)/_layout.tsx`
- `routes/tabs/` — home, accounts, cards, transactions (código completo), family
- `routes/stack/` — account-detail, connect-open-finance, transaction-detail, sharing-settings, family-members, recurring-expenses, categories
- `routes/stack/settings/` — profile, security-mfa, data-export-deletion, notifications

---

## 6. Performance mobile aplicada

- **Listas (`claude.md` §16.1):** todas as listagens (transações, contas, cartões, membros, categorias, recorrências) usam `FlatList`, nunca `ScrollView` + `.map()`. Ver `windowSize`/`maxToRenderPerBatch`/`removeClippedSubviews` no exemplo de código completo em [`routes/tabs/transactions.md`](./routes/tabs/transactions.md).
- **`useCallback`/memoização (`claude.md` §16.3) — exemplo concreto:** em `transactions.tsx`, `renderItem` é envolvido em `useCallback` com dependência apenas em `handlePressItem`; sem isso, a cada re-render da tela (ex.: ao chegar uma nova página via `fetchNextPage`) o `FlatList` receberia uma nova referência de função e invalidaria a otimização de `React.memo` interna dos itens renderizados, forçando re-render de toda a lista visível em vez de apenas dos itens novos. O componente `ListItem` em si é exportado como `React.memo(ListItem)` para essa otimização fazer efeito.
- **Imagens de instituições financeiras (Pluggy):** o Pluggy retorna `institutionLogoUrl` como URL remota (PNG/SVG hospedado pelo próprio Pluggy). Estratégia:
  - Usar `expo-image` (não `Image` do RN core) por já implementar cache em disco (`cachePolicy="disk"`) e decodificação assíncrona fora da UI thread.
  - Definir `placeholder` (blurhash genérico ou ícone de banco padrão) para evitar layout shift enquanto a logo carrega.
  - Tamanho fixo pequeno (ex.: 32x32 / 48x48 em `ListItem`/`AccountCard`) — nunca renderizar a imagem no tamanho original vindo da API.
  - `priority="low"` para logos em listas longas (não competem por banda com o carregamento inicial da tela).
  - Fallback: se `institutionLogoUrl` for nulo ou o load falhar (`onError`), exibir um ícone genérico local (SVG em `assets/images/bank-generic.svg`) — nunca deixar espaço vazio/quebrado.

---

## Suposições desta spec

1. **Query dedicada `account(id: ID!)` / `card(id: ID!)`:** o SDL de `02-API-AUTH.md` §3.5 expõe apenas `accounts(familyId: ID!): [Account!]!` e `cards(familyId: ID!): [Card!]!` (sem query por id único). Assumido aqui que as telas de detalhe (`account/[id]`, `card/[id]`) reutilizam o cache já populado pela lista (TanStack Query normaliza por `queryKey`, e o item é localizado por `id` a partir dos dados já buscados) — evita nova ida ao servidor. Se o time de backend adicionar `account(id: ID!): Account` / `card(id: ID!): Card` futuramente, a tela passa a buscar diretamente sem mudança de rota.
2. **Tela de compartilhamento por conta/cartão:** o SDL já expõe `updateAccountSharing`/`updateCardSharing` (mutations diretas em `02-API-AUTH.md` §3.5) **e** `updateSharingPermission` (via `SharingPermission`, §3.6). Assumido que as telas `sharing/account/[id]` e `sharing/card/[id]` usam as mutations diretas (`updateAccountSharing`/`updateCardSharing`) por serem mais simples e específicas; a tela `sharing/index.tsx` (visão geral) lista via `sharingPermissions(familyId)` e permite editar via `updateSharingPermission` quando o usuário navega a partir da visão consolidada. Ambos os caminhos escrevem o mesmo estado no backend — a duplicação de mutation é do próprio schema, não desta spec.
3. **Preferências de notificação:** não há mutation/tipo `NotificationPreferences` no SDL de `02-API-AUTH.md`. A tela `settings/notifications.tsx` é especificada aqui como **placeholder de UI** com estado local (Zustand/SecureStore), sem persistência no backend, até que o schema seja estendido — sinalizado para o time de API.
4. **Deep link scheme do app:** assumido `vidinha://` para o redirect OAuth (`vidinha://auth/callback`), consistente com o exemplo de `02-API-AUTH.md` §1.4. Deve ser configurado em `app.config.ts` (`scheme: "vidinha"`) e registrado nos providers OAuth (Google Console, Apple Developer).
5. **GraphQL Code Generator:** assumido uso de `@graphql-codegen/cli` com `packages/graphql-schema/schema.graphql` (fonte única do SDL no monorepo, `00-DECISIONS.md` §11; já previsto em `02-API-AUTH.md` §6 como artefato de CI) como fonte, gerando os tipos consumidos pelo workspace `@vidinha/graphql-types` (`packages/graphql-types`) e reexportados em `apps/mobile/src/types/graphql-generated.ts` — não estava explicitado no material de origem, mas decorre diretamente de "TypeScript em toda a aplicação" (`claude.md` §12) aplicado às respostas GraphQL.
6. **Modo de exibição "privacidade" do `Amount` (`hideValue`):** não é um requisito explícito das specs anteriores; incluído como prop opcional do design system por ser um padrão comum em apps financeiros e não implica nenhuma mudança de schema/backend (é puramente de apresentação). Pode ser ignorado na primeira versão do MVP sem impacto arquitetural.
7. **`react-native-ssl-public-key-pinning` requer EAS Dev Client:** conforme já indicado em `00-DECISIONS.md` §6, isso significa que `expo start` padrão (Expo Go) **não pode ser usado** para testar o app com pinning ativo — assumido aqui que o ambiente de desenvolvimento local usa um build de Dev Client (`eas build --profile development`) desde o início do projeto, não apenas em builds de release.
