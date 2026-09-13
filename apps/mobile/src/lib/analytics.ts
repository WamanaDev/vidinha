/**
 * Placeholder de breadcrumbs Sentry (claude.md §45, 00-DECISIONS.md §9).
 * TODO: inicializar @sentry/react-native quando EXPO_PUBLIC_SENTRY_DSN_MOBILE
 * estiver preenchido em apps/mobile/.env (credencial ainda não existe).
 */
export function trackBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.log(`[breadcrumb] ${message}`, data ?? {});
  }
  // TODO: Sentry.addBreadcrumb({ message, data });
}

export function captureException(error: unknown): void {
  if (__DEV__) {
    console.error("[analytics] exceção capturada", error);
  }
  // TODO: Sentry.captureException(error);
}
