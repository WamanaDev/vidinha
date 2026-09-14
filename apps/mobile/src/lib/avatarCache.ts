import * as FileSystem from "expo-file-system";

// Cache local de foto de perfil, chaveado por `userId` — não por URL, porque
// `User.avatarUrl` é sempre uma signed READ URL gerada sob demanda pelo
// backend (specs/security/file-uploads.md §3: "nunca é persistida nem
// cacheada — é recalculada a cada resposta"), então duas leituras do mesmo
// avatar têm URLs diferentes e o cache por URL do `expo-image`
// (`cachePolicy="disk"`) nunca acertaria. Regra explícita do produto: só
// busca da rede se não houver cópia local; se buscar, cacheia para a
// próxima vez.
//
// Não é dado sensível (é uma foto, não um segredo — MASVS-STORAGE trata como
// armazenamento comum), por isso usa o diretório de cache do app via
// `expo-file-system` em vez de Expo SecureStore (reservado para
// tokens/credenciais).

const AVATAR_CACHE_DIR = `${FileSystem.cacheDirectory}avatars/`;

function cachePathFor(userId: string): string {
  return `${AVATAR_CACHE_DIR}${userId}.img`;
}

async function ensureCacheDirExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(AVATAR_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AVATAR_CACHE_DIR, {
      intermediates: true,
    });
  }
}

/**
 * Retorna a `uri` local em cache para o avatar de `userId`, ou `null` se
 * ainda não houver cópia local.
 */
export async function getCachedAvatarUri(
  userId: string,
): Promise<string | null> {
  try {
    const path = cachePathFor(userId);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? path : null;
  } catch {
    return null;
  }
}

/**
 * Busca `remoteUrl` (signed READ URL) e salva no cache local de `userId`,
 * retornando a `uri` local pronta para uso em `<Avatar uri={...} />`.
 * Melhor esforço: em caso de falha de rede, retorna `null` (quem chamou
 * decide o fallback, ex.: manter as iniciais).
 */
export async function cacheAvatarFromUrl(
  userId: string,
  remoteUrl: string,
): Promise<string | null> {
  try {
    await ensureCacheDirExists();
    const path = cachePathFor(userId);
    const result = await FileSystem.downloadAsync(remoteUrl, path);
    return result.status === 200 ? path : null;
  } catch {
    return null;
  }
}

/**
 * Invalida a cópia em cache de `userId` (ex.: depois de um novo upload de
 * avatar, para não continuar servindo a foto antiga até expirar por outro
 * motivo).
 */
export async function invalidateCachedAvatar(userId: string): Promise<void> {
  try {
    const path = cachePathFor(userId);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch {
    // best-effort — mesma abordagem de exclusão do avatar antigo no backend
    // (specs/security/file-uploads.md §5).
  }
}

/**
 * Resolve a `uri` a ser exibida para o avatar de `userId`: cache local se
 * existir; senão baixa de `remoteUrl` e cacheia para a próxima vez. Retorna
 * `null` se não houver `remoteUrl` nem cache (caller usa o fallback de
 * iniciais do `Avatar`).
 */
export async function resolveAvatarUri(
  userId: string,
  remoteUrl: string | null | undefined,
): Promise<string | null> {
  const cached = await getCachedAvatarUri(userId);
  if (cached) return cached;
  if (!remoteUrl) return null;
  return cacheAvatarFromUrl(userId, remoteUrl);
}
