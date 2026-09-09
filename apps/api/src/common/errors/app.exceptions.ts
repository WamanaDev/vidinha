import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "./error-codes.enum";

/**
 * Exceção base tipada por `ErrorCode`, consumida pelo `GraphQLExceptionFilter`
 * (ver specs/backend/common/exception-filter.md). `message` é sempre um texto
 * seguro para exibição direta ao usuário final, nunca detalhes internos.
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    status: HttpStatus,
  ) {
    super({ message, code }, status);
  }
}

export class UnauthenticatedAppException extends AppException {
  constructor(
    message = "Você precisa estar autenticado para realizar esta ação.",
  ) {
    super(message, ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = "Você não tem permissão para executar esta ação.") {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }
}

/**
 * Usado tanto para recurso inexistente quanto para recurso existente mas fora
 * do escopo do usuário — nunca revelar existência de recursos de terceiros
 * (ver specs/backend/common/exception-filter.md §2).
 */
export class NotFoundAppException extends AppException {
  constructor(message = "Recurso não encontrado.") {
    super(message, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}

export class BadUserInputAppException extends AppException {
  constructor(message = "Dados inválidos.") {
    super(message, ErrorCode.BAD_USER_INPUT, HttpStatus.BAD_REQUEST);
  }
}

export class ConflictAppException extends AppException {
  constructor(message = "Conflito com o estado atual do recurso.") {
    super(message, ErrorCode.CONFLICT, HttpStatus.CONFLICT);
  }
}

export class MfaRequiredAppException extends AppException {
  constructor(message = "Esta ação exige verificação adicional (MFA).") {
    super(message, ErrorCode.MFA_REQUIRED, HttpStatus.FORBIDDEN);
  }
}

export class UpstreamErrorAppException extends AppException {
  constructor(
    message = "Falha ao comunicar com um serviço externo. Tente novamente mais tarde.",
  ) {
    super(message, ErrorCode.UPSTREAM_ERROR, HttpStatus.BAD_GATEWAY);
  }
}
