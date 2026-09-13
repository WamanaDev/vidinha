import { QueryClient } from "@tanstack/react-query";

// specs/mobile/00-overview.md §3.1 — TanStack Query como estado de servidor.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false, // RN não tem "window focus"; usar onAppStateChange (analytics.ts/App root)
    },
  },
});
