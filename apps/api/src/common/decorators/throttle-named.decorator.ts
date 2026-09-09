import { Throttle } from "@nestjs/throttler";

/**
 * Helpers para os named throttlers definidos em `app.module.ts`
 * (ver specs/backend/common/rate-limiting.md).
 */
export const ThrottleDefault = () =>
  Throttle({ default: { limit: 120, ttl: 60_000 } });
export const ThrottleAuthSensitive = () =>
  Throttle({ "auth-sensitive": { limit: 5, ttl: 60_000 } });
export const ThrottleInvite = () =>
  Throttle({ invite: { limit: 10, ttl: 60_000 } });
export const ThrottleOpenFinanceSync = () =>
  Throttle({ "openfinance-sync": { limit: 6, ttl: 60_000 } });
export const ThrottleMutationWrite = () =>
  Throttle({ "mutation-write": { limit: 60, ttl: 60_000 } });
