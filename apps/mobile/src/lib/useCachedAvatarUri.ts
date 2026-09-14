import { useEffect, useState } from "react";
import { resolveAvatarUri } from "@lib/avatarCache";

/**
 * Resolve a `uri` a ser passada para `<Avatar uri={...} />`: cache local em
 * disco (chaveado por `userId`) se existir, senão baixa de `remoteUrl` (a
 * signed READ URL retornada pelo GraphQL) e cacheia para a próxima vez. Ver
 * `@lib/avatarCache` para a justificativa de cachear por `userId` em vez de
 * por URL.
 */
export function useCachedAvatarUri(
  userId: string | undefined,
  remoteUrl: string | null | undefined,
): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setUri(null);
      return;
    }
    resolveAvatarUri(userId, remoteUrl).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, remoteUrl]);

  return uri;
}
