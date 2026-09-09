/** Enum fechado de códigos de erro expostos em `extensions.code` (ver specs/backend/common/exception-filter.md). */
export enum ErrorCode {
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  BAD_USER_INPUT = "BAD_USER_INPUT",
  RATE_LIMITED = "RATE_LIMITED",
  MFA_REQUIRED = "MFA_REQUIRED",
  CONFLICT = "CONFLICT",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
