/* eslint-env node */
const path = require("node:path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
// Monorepo pnpm workspace: a raiz real fica dois níveis acima de apps/mobile
// (apps/mobile -> apps -> vidinha).
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// O Metro não segue symlinks por padrão, mas o pnpm resolve todo o
// node_modules via symlinks para o store compartilhado em node_modules/.pnpm
// (na raiz do workspace) — sem isso, módulos hoisted (como expo-router)
// nunca são encontrados em runtime, mesmo existindo em disco.
config.resolver.unstable_enableSymlinks = true;

// Deixa o Metro observar a raiz do monorepo (onde o node_modules real
// vive), não só apps/mobile.
//
// Se existir um .npmrc local (não versionado — ver README) apontando
// virtual-store-dir para fora do workspace (necessário no Windows para
// evitar o limite de 260 caracteres em builds nativos do Android), o pnpm
// resolve os symlinks de node_modules para lá. Sem observar essa pasta
// também, o crawler do Metro nunca indexa esses arquivos e a resolução via
// symlink falha com "Unable to resolve module", mesmo o arquivo existindo
// em disco. (O HMR quebrando nesse cenário é um bug separado do Metro,
// contornado via patches/metro@0.80.12.patch.)
const fs = require("node:fs");
const watchFolders = [workspaceRoot];
try {
  const npmrcPath = path.resolve(workspaceRoot, ".npmrc");
  const npmrc = fs.readFileSync(npmrcPath, "utf8");
  const match = npmrc.match(/^\s*virtual-store-dir\s*=\s*(.+)\s*$/m);
  if (match) {
    const storeDir = path.resolve(workspaceRoot, match[1].trim());
    if (fs.existsSync(storeDir) && !storeDir.startsWith(workspaceRoot)) {
      watchFolders.push(storeDir);
    }
  }
} catch {
  // Sem .npmrc local — comportamento padrão (store dentro do workspace).
}
config.watchFolders = watchFolders;

// Procura módulos tanto em apps/mobile/node_modules quanto na raiz do
// workspace, na ordem certa.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
