# CI/CD — `release.yml` (Versionamento e Release via Changesets)

> Parte de [Infraestrutura e CI/CD — 00-overview.md](./00-overview.md).
> Implementa exatamente o fluxo descrito em [git-workflow.md](./git-workflow.md) §8 ("Versionamento semântico e releases via Changesets"). Este arquivo era referenciado como "novo, adicionar à lista de workflows" e ainda não existia como documento próprio — este documento fecha essa lacuna.

## Objetivo

Como `apps/api` e `apps/mobile` têm ciclos de release independentes dentro do mesmo monorepo, este workflow:

1. Ao merge de qualquer PR em `main`, roda `changeset version` e mantém aberto/atualizado um PR **"Version Packages"** consolidando os bumps pendentes (usando a action oficial `changesets/action`).
2. Ao mergear esse PR de versão, cria as tags `api-vX.Y.Z` e/ou `mobile-vX.Y.Z` (conforme quais pacotes tiveram bump — nunca uma tag genérica `vX.Y.Z`) e publica uma GitHub Release por tag com o changelog gerado pelo Changesets.
3. Especificamente para `apps/mobile`, sincroniza a versão em `apps/mobile/app.config.ts` (`expo.version`) e incrementa `ios.buildNumber`/`android.versionCode` **antes** de disparar o workflow de build mobile ([ci-cd-build-mobile.md](./ci-cd-build-mobile.md)) via `workflow_call`.

Este workflow **não** substitui `deploy-web.yml` (o deploy contínuo do backend continua acontecendo a cada merge em `main`, independente de release) nem decide se um build mobile deve ir para loja — ele só versiona, tageia, publica release notes e aciona o build já configurado.

## Trigger

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write
```

## Job 1 — `version`: abre/atualiza o PR "Version Packages"

Roda em todo push em `main`. Se houver changesets pendentes (`.changeset/*.md` além do `README.md`), a action `changesets/action` abre ou atualiza um PR chamado `chore: version packages` com os bumps de versão e o `CHANGELOG.md` de cada pacote afetado já aplicados. Se **não** houver changesets pendentes e o push for exatamente o merge do PR de versão (identificável pelo commit de merge gerado pela própria action), a action publica as tags e cria as Releases (etapa combinada pela própria `changesets/action`, ver `publish` abaixo).

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Create Release PR or tag+publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: pnpm changeset version
          publish: pnpm changeset tag
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Registrar tags criadas
        if: steps.changesets.outputs.published == 'true'
        run: echo "Tags publicadas nesta execução:'${{ steps.changesets.outputs.publishedPackages }}'"
```

`changesets/action` já cobre, sozinha:
- Detectar changesets pendentes e rodar `changeset version` (bump de `package.json`/`CHANGELOG.md` por pacote afetado, respeitando SemVer independente por app — ver tabela de bump em `git-workflow.md` §8).
- Abrir/atualizar o PR de versão automaticamente a cada novo push em `main` enquanto houver changesets pendentes.
- Ao detectar que o push é o **merge do PR de versão** (branch `changeset-release/main` mesclada), rodar `changeset tag` (criação das tags Git, uma por pacote com bump, já usando o prefixo configurado em `.changeset/config.json` — `api-v` e `mobile-v`) e expor `steps.changesets.outputs.published` / `publishedPackages`.

**Configuração necessária em `.changeset/config.json`** (referenciada aqui, não repetida como arquivo próprio): `"tag": true` com prefixo customizado por pacote, resolvendo `apps/api` → `api-v` e `apps/mobile` → `mobile-v`, conforme a convenção de tags de `git-workflow.md` §8.

## Job 2 — `mobile-version-sync`: sincroniza `app.config.ts` e dispara o build mobile

Roda somente quando o Job 1 efetivamente publicou (`published == 'true'`) e a lista de pacotes publicados inclui `apps/mobile`.

```yaml
  mobile-version-sync:
    runs-on: ubuntu-latest
    needs: version
    if: needs.version.outputs.published == 'true' && contains(needs.version.outputs.publishedPackages, '"apps/mobile"')
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Ler versão publicada de apps/mobile
        id: mobile_version
        working-directory: apps/mobile
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"

      - name: Sincronizar app.config.ts e incrementar build numbers
        working-directory: apps/mobile
        run: |
          node ./scripts/sync-app-version.js \
            --version "${{ steps.mobile_version.outputs.version }}" \
            --bump-ios-build-number \
            --bump-android-version-code
        # sync-app-version.js: script do próprio app (a criar em apps/mobile/scripts/)
        # que escreve expo.version, ios.buildNumber (incrementado) e
        # android.versionCode (incrementado) em apps/mobile/app.config.ts.

      - name: Commit da sincronização de versão mobile
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add apps/mobile/app.config.ts
          git commit -m "chore(mobile): sync app version to ${{ steps.mobile_version.outputs.version }} [skip ci]" || echo "Nada para commitar"
          git push origin main

      - name: Disparar build mobile (workflow_call)
        uses: ./.github/workflows/build-mobile.yml
        with:
          profile: production
          platform: all
```

**Nota sobre `workflow_call` vs `repository_dispatch`:** a chamada acima usa `workflow_call` (reutilização direta de workflow reusável, mesmo repositório) como abordagem primária, por ser mais simples e não exigir um PAT/token extra além do `GITHUB_TOKEN` padrão. `repository_dispatch` é a alternativa documentada caso o disparo precise cruzar repositórios no futuro (ex.: se `apps/mobile` for extraído para repositório próprio) — nesse caso, o job `mobile-version-sync` trocaria o último step por um `POST` autenticado ao endpoint `repos/{owner}/{repo}/dispatches` com `event_type: mobile-release`, e `ci-cd-build-mobile.md` ganharia um trigger `repository_dispatch: types: [mobile-release]` em paralelo ao `workflow_call` já existente.

## Job 3 — `github-release`: publica a GitHub Release por tag

Também condicionado a `published == 'true'`; roda uma vez por tag criada (uma execução por pacote com bump: `api` e/ou `mobile`).

```yaml
  github-release:
    runs-on: ubuntu-latest
    needs: version
    if: needs.version.outputs.published == 'true'
    strategy:
      matrix:
        package: ${{ fromJson(needs.version.outputs.publishedPackages) }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Criar GitHub Release para ${{ matrix.package.name }}@${{ matrix.package.version }}
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ matrix.package.name == 'apps/api' && 'api-v' || 'mobile-v' }}${{ matrix.package.version }}
          name: ${{ matrix.package.name == 'apps/api' && 'API' || 'Mobile' }} v${{ matrix.package.version }}
          body_path: ${{ matrix.package.name }}/CHANGELOG.md  # trecho da versão atual é extraído pela action a partir das seções mais recentes
          generate_release_notes: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Resumo do fluxo (igual a `git-workflow.md` §8, item 3-4)

```text
Push em main (PR normal mergeado)
        ↓
Job "version" (changesets/action)
        ↓
Há changeset(s) pendente(s)?
   ├─ Sim → abre/atualiza PR "chore: version packages"  (fim desta execução)
   └─ Não, e este push É o merge do PR de versão:
        ↓
      changeset tag → cria api-vX.Y.Z e/ou mobile-vX.Y.Z
        ↓
      Job "github-release" → 1 GitHub Release por tag, changelog do Changesets
        ↓
      Job "mobile-version-sync" (só se apps/mobile teve bump):
        sincroniza app.config.ts (version/buildNumber/versionCode)
        → commit direto em main
        → workflow_call → ci-cd-build-mobile.md (profile production)
```

## Suposições desta spec

1. `changesets/action@v1` é a action oficial mantida pela equipe do Changesets; sua saída exata (`published`, `publishedPackages`) segue o contrato documentado por ela — o formato de `publishedPackages` (lista de `{name, version}`) é assumido aqui e deve ser conferido na implementação real.
2. O script `apps/mobile/scripts/sync-app-version.js` é uma peça de implementação nova, não existente ainda no repositório — este documento assume sua interface (`--version`, `--bump-ios-build-number`, `--bump-android-version-code`) como proposta inicial, ajustável sem mudar a arquitetura do workflow.
3. O commit automático de sincronização de versão mobile (`chore(mobile): sync app version...`) é feito diretamente em `main` pelo bot do GitHub Actions, análogo ao commit de `changeset version`; isso exige que a proteção de branch de `main` (ver `git-workflow.md` §7) permita bypass para o `GITHUB_TOKEN` em Actions ou use uma exceção equivalente — a ser configurada junto com a branch protection.
4. `softprops/action-gh-release@v2` é usada como exemplo de action de terceiro consolidada para criar Releases; pode ser trocada por `gh release create` via CLI sem mudar a estratégia.
