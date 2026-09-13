import { GraphQLClient } from "graphql-request";
import { supabaseClient } from "./supabaseClient";
import { env } from "@config/env";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_USER_INPUT"
  | "RATE_LIMITED"
  | "MFA_REQUIRED"
  | "CONFLICT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

/**
 * Erro tipado que a camada de hooks (TanStack Query) recebe.
 * Espelha o formato de extensions definido em 02-API-AUTH.md §4.1.
 */
export class GraphQLApiError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly requestId?: string,
    public readonly debugMessage?: string,
  ) {
    super(message);
    this.name = "GraphQLApiError";
  }
}

const rawClient = new GraphQLClient(env.GRAPHQL_ENDPOINT, {
  // Timeout curto: a API roda em Vercel Serverless (cold start possível),
  // mas o plano Hobby já limita a função a 10s — não vale a pena esperar mais que isso no client.
  fetch: (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
});

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Callback registrado pelo AuthProvider para reagir a sessão irrecuperável. */
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

/**
 * Coalescing de refresh de token: várias chamadas concorrentes que recebem
 * UNAUTHENTICATED ao mesmo tempo compartilham uma única promise de refresh em
 * vez de cada uma chamar `refreshSession()` independentemente (o que
 * dispararia múltiplos refreshes simultâneos e poderia invalidar tokens uns
 * dos outros).
 */
let refreshPromise: ReturnType<
  typeof supabaseClient.auth.refreshSession
> | null = null;

function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = supabaseClient.auth.refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function extractApiError(error: unknown): GraphQLApiError {
  // graphql-request lança ClientError com `.response.errors`
  const gqlErrors = (error as any)?.response?.errors as
    { message: string; extensions?: Record<string, unknown> }[] | undefined;

  const first = gqlErrors?.[0];
  const code = (first?.extensions?.code as ErrorCode) ?? "INTERNAL_ERROR";
  const requestId = first?.extensions?.requestId as string | undefined;
  const debugMessage = __DEV__
    ? (first?.extensions?.debugMessage as string | undefined)
    : undefined;

  return new GraphQLApiError(
    first?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
    code,
    requestId,
    debugMessage,
  );
}

/**
 * Executa uma operação GraphQL autenticada, com uma única tentativa de
 * refresh de sessão em caso de UNAUTHENTICATED (02-API-AUTH.md §1.5).
 */
export async function graphqlRequest<TData, TVariables extends object = object>(
  document: string,
  variables?: TVariables,
  _isRetry = false,
): Promise<TData> {
  const token = await getAccessToken();

  const client = token
    ? rawClient.setHeader("Authorization", `Bearer ${token}`)
    : rawClient;

  try {
    return await client.request<TData, TVariables>({
      document,
      variables,
    } as never);
  } catch (error) {
    const apiError = extractApiError(error);

    if (apiError.code === "UNAUTHENTICATED" && !_isRetry) {
      const { data, error: refreshError } = await refreshSessionOnce();
      if (!refreshError && data.session) {
        return graphqlRequest<TData, TVariables>(document, variables, true);
      }
      onSessionExpired?.();
    }

    throw apiError;
  }
}
