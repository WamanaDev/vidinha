import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOpenFinanceConnectionsList,
  syncOpenFinanceConnection,
} from "@features/open-finance/services/openFinance.graphql";

// Intervalo entre tentativas de sync automático de uma conexão pendente, e
// número máximo de tentativas antes de desistir (evita martelar a API pra
// sempre se uma conexão ficar genuinamente travada — ~4 minutos de
// tentativas, tempo generoso considerando que o sandbox normalmente termina
// em segundos e uma instituição real pode levar até alguns minutos).
const AUTO_SYNC_INTERVAL_MS = 8000;
const AUTO_SYNC_MAX_ATTEMPTS = 30;

/** Lista as conexões Open Finance da família ativa — `open-finance/connections`. */
export function useOpenFinanceConnections(familyId: string) {
  const queryClient = useQueryClient();
  const attemptsRef = useRef<Record<string, number>>({});

  const query = useQuery({
    queryKey: ["openFinanceConnections", familyId],
    queryFn: () => fetchOpenFinanceConnectionsList({ familyId }),
    enabled: Boolean(familyId),
  });

  // O item Pluggy sincroniza em segundo plano depois de criado — a conexão
  // nasce "UPDATING" e só muda quando essa sincronização termina, avisada
  // por um webhook (item/updated). Na prática o webhook às vezes não chega
  // (ex.: timeout de cold start do lado do servidor) e a tela ficava presa
  // em "Sincronizando" pra sempre. Como rede de segurança, chamamos
  // `syncOpenFinanceConnection` (o mesmo que o botão "Sincronizar" manual)
  // periodicamente enquanto houver conexão pendente — silenciosamente, sem
  // expor erro de uma tentativa automática ao usuário (quem quiser forçar
  // na hora continua tendo o botão manual).
  useEffect(() => {
    const connections = query.data?.openFinanceConnections ?? [];
    const pending = connections.filter((c) => c.status === "UPDATING");
    if (pending.length === 0) return;

    const timer = setTimeout(() => {
      pending.forEach((connection) => {
        const attempts = attemptsRef.current[connection.id] ?? 0;
        if (attempts >= AUTO_SYNC_MAX_ATTEMPTS) return;
        attemptsRef.current[connection.id] = attempts + 1;

        syncOpenFinanceConnection(connection.id)
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: ["openFinanceConnections", familyId],
            });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["cards"] });
          })
          .catch(() => {
            // Tentativa automática silenciosa — próximo ciclo tenta de novo.
          });
      });
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [query.data, familyId, queryClient]);

  return query;
}
