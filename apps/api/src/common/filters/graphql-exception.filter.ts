import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { GqlExceptionFilter } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { randomUUID } from "node:crypto";
import { AppException } from "@common/errors/app.exceptions";
import { ErrorCode } from "@common/errors/error-codes.enum";

/**
 * Filtro global de exceções GraphQL — traduz qualquer erro (conhecido ou não)
 * para o formato padronizado de `extensions` descrito em
 * specs/backend/common/exception-filter.md. Nunca vaza stack trace, query SQL,
 * caminho interno ou detalhes de infraestrutura ao cliente.
 */
@Catch()
export class GraphQLExceptionFilter
  implements ExceptionFilter, GqlExceptionFilter
{
  private readonly logger = new Logger("GraphQLExceptionFilter");

  catch(exception: unknown, _host: ArgumentsHost): GraphQLError {
    const requestId = randomUUID();

    this.logger.error({ requestId, exception });

    if (exception instanceof AppException) {
      const response = exception.getResponse() as {
        message: string;
        code: ErrorCode;
      };
      return new GraphQLError(response.message, {
        extensions: { code: response.code, requestId },
      });
    }

    // ForbiddenError do @casl/ability tem `.message` seguro por convenção do próprio pacote,
    // mas ainda assim tratamos como erro genérico de autorização para não vazar detalhes da ability.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        status === 401
          ? ErrorCode.UNAUTHENTICATED
          : status === 403
            ? ErrorCode.FORBIDDEN
            : ErrorCode.BAD_USER_INPUT;
      return new GraphQLError(exception.message ?? "Requisição inválida.", {
        extensions: { code, requestId },
      });
    }

    // Qualquer erro não mapeado (Prisma, bug interno, etc.) — resposta genérica.
    return new GraphQLError(
      "Ocorreu um erro interno. Tente novamente mais tarde.",
      {
        extensions: { code: ErrorCode.INTERNAL_ERROR, requestId },
      },
    );
  }
}
