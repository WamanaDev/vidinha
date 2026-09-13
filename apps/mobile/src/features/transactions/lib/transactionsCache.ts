import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { TransactionNode } from "@app-types/graphql-generated";
import type { TransactionsQueryResult } from "@features/transactions/services/transactions.graphql";

// SUPOSIÇÃO: specs/mobile/routes/stack/transaction-detail.md diz que o dado
// da tela de detalhe "vem do cache do TanStack Query, populado pela lista de
// transações". O SDL real (packages/graphql-schema/schema.graphql) só expõe
// `transactions(filter, ...)` — não existe uma query singular
// `transaction(id)`. Então, na ausência de uma forma de buscar um lançamento
// isolado no servidor, o fallback quando o cache não tem o item é procurar em
// TODAS as páginas de TODAS as queries `["transactions", ...]` já cacheadas
// (não só a variação de filtro atual) e, se mesmo assim não achar (ex.: deep
// link direto após reinício do app, cache vazio), mostrar o estado
// "not-found" — não há como buscar do servidor por enquanto.

/** Procura um lançamento por id em qualquer página de qualquer query `transactions` cacheada. */
export function findTransactionInCache(
  queryClient: QueryClient,
  transactionId: string,
): TransactionNode | undefined {
  const queries = queryClient.getQueriesData<
    InfiniteData<TransactionsQueryResult>
  >({
    queryKey: ["transactions"],
  });

  for (const [, data] of queries) {
    if (!data) continue;
    for (const page of data.pages) {
      const edge = page.transactions.edges.find(
        (e) => e.node.id === transactionId,
      );
      if (edge) return edge.node;
    }
  }

  return undefined;
}

/** Aplica um patch (ex.: resultado de uma mutation) ao node correspondente em todo o cache de `transactions`. */
export function patchTransactionInCache(
  queryClient: QueryClient,
  transactionId: string,
  patch: Partial<TransactionNode>,
): void {
  queryClient.setQueriesData<InfiniteData<TransactionsQueryResult>>(
    { queryKey: ["transactions"] },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          transactions: {
            ...page.transactions,
            edges: page.transactions.edges.map((edge) =>
              edge.node.id === transactionId
                ? { ...edge, node: { ...edge.node, ...patch } }
                : edge,
            ),
          },
        })),
      };
    },
  );
}
