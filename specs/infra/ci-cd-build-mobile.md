# CI/CD — `build-mobile.yml` (Build via EAS)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Ajustado ao monorepo — ver `00-DECISIONS.md` §11 e [git-workflow.md](./git-workflow.md).

Disparo manual (`workflow_dispatch`), por push em `apps/mobile/**`/`packages/**` gerando tag `mobile-v*.*.*` (ver [ci-cd-release.md](./ci-cd-release.md)), ou via `workflow_call`/`repository_dispatch` acionado pelo próprio workflow de release após o bump de versão do app mobile. Builds de EAS Free são limitados por mês (ver [known-limitations.md](./known-limitations.md)), então não rodam a cada PR.

**Importante (monorepo):** a CLI do EAS (`eas-cli`) espera rodar **a partir da pasta do app Expo** (onde vivem `app.config.ts`/`app.json` e `eas.json`), não da raiz do workspace pnpm. Todos os steps que invocam `eas` usam `working-directory: apps/mobile`. A instalação de dependências (`pnpm install`), por outro lado, continua rodando na raiz do monorepo, pois o lockfile do pnpm workspace é único.

```yaml
name: Build Mobile (EAS)

on:
  workflow_dispatch:
    inputs:
      profile:
        description: "Build profile (development | staging | production)"
        required: true
        default: staging
      platform:
        description: "Plataforma (android | ios | all)"
        required: true
        default: all
  push:
    tags:
      - "mobile-v*.*.*"
  workflow_call:
    inputs:
      profile:
        type: string
        default: production
      platform:
        type: string
        default: all

jobs:
  eas-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npm install -g eas-cli
      - name: EAS Build
        working-directory: apps/mobile
        run: eas build --platform ${{ inputs.platform || github.event.inputs.platform || 'all' }} --profile ${{ inputs.profile || github.event.inputs.profile || 'production' }} --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  eas-update:
    runs-on: ubuntu-latest
    needs: eas-build
    if: (inputs.profile || github.event.inputs.profile) != 'development'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npm install -g eas-cli
      - name: EAS Update
        working-directory: apps/mobile
        run: eas update --branch ${{ inputs.profile || github.event.inputs.profile || 'production' }} --message "CI update ${{ github.sha }}"
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

O profile `development` no `apps/mobile/eas.json` corresponde ao **Dev Client customizado com SSL pinning** (`developmentClient: true`), necessário porque a lib de pinning exige código nativo que não roda no Expo Go. Esse build é o único artefato que devs instalam localmente para testar contra staging/production com pinning ativo.

Notas de monorepo:
- Tags de build seguem o prefixo por app definido em `git-workflow.md` §8: `mobile-vX.Y.Z` (nunca uma tag genérica `vX.Y.Z`), para não disparar build mobile a partir de uma tag de release do backend (`api-vX.Y.Z`).
- Quando disparado via `workflow_call` pelo workflow de release (ver [ci-cd-release.md](./ci-cd-release.md)), a sincronização de `expo.version`/`ios.buildNumber`/`android.versionCode` em `apps/mobile/app.config.ts` já foi feita **antes** desta chamada, pelo próprio workflow de release — este workflow apenas builda a versão já commitada.
- Trigger por `paths` não se aplica ao `push: tags:` (tags não têm `paths` no GitHub Actions); a filtragem correta acontece pelo prefixo da tag (`mobile-v*.*.*`), que só é criada quando `apps/mobile/**` ou `packages/**` tiveram bump de versão.
