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

// Deixa o Metro observar a raiz do monorepo (onde o node_modules/.pnpm real
// vive), não só apps/mobile.
config.watchFolders = [workspaceRoot];

// Procura módulos tanto em apps/mobile/node_modules quanto na raiz do
// workspace, na ordem certa.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
