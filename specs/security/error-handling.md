# Tratamento de erros seguro — Exception Filter NestJS/GraphQL

> Parte de [Segurança e Compliance — 00-overview.md](./00-overview.md).

Objetivo: nunca vazar stack trace, mensagens internas de banco/Prisma, paths de arquivo ou detalhes de infraestrutura ao cliente GraphQL. Detalhes completos vão para Sentry + logs (`nestjs-pino`), o cliente recebe apenas uma mensagem segura + código de erro estável.

```typescript
// src/common/filters/graphql-exception.filter.ts
import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import * as Sentry from '@sentry/node';
import { Prisma } from '@prisma/client';

// Mapa de erros "esperados" que podem expor uma mensagem amigável.
// Qualquer coisa fora desse mapa vira mensagem genérica.
const SAFE_ERROR_CODES = new Set([
  'BAD_USER_INPUT',
  'FORBIDDEN',
  'NOT_FOUND',
  'UNAUTHENTICATED',
  'CONFLICT',
]);

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger('GraphQLExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): GraphQLError {
    const gqlHost = GqlArgumentsHost.create(host);
    const info = gqlHost.getInfo();
    const context = gqlHost.getContext();
    const userId = context?.req?.user?.id ?? 'anonymous';

    // 1. Sempre loga o erro completo internamente (nunca ao cliente).
    this.logger.error({
      msg: 'Unhandled GraphQL error',
      field: info?.fieldName,
      userId,
      error:
        exception instanceof Error
          ? { message: exception.message, stack: exception.stack }
          : exception,
    });

    // 2. Envia detalhes completos ao Sentry, com contexto útil, sem PII sensível.
    Sentry.withScope((scope) => {
      scope.setUser({ id: userId });
      scope.setTag('graphql.field', info?.fieldName ?? 'unknown');
      Sentry.captureException(exception);
    });

    // 3. Erros de negócio conhecidos (HttpException com código seguro) podem
    //    repassar a mensagem — desde que o código esteja na allowlist.
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const code =
        typeof response === 'object' && response !== null && 'code' in response
          ? String((response as any).code)
          : 'BAD_USER_INPUT';

      if (SAFE_ERROR_CODES.has(code)) {
        return new GraphQLError(exception.message, {
          extensions: { code },
        });
      }
    }

    // 4. Erros do Prisma (constraint violation, etc.) nunca vazam SQL/coluna.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return new GraphQLError('Não foi possível concluir a operação.', {
        extensions: { code: 'CONFLICT' },
      });
    }

    // 5. Qualquer coisa não mapeada: mensagem genérica, sem stack, sem detalhes.
    return new GraphQLError('Ocorreu um erro interno. Tente novamente.', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
```

Registro global:

```typescript
// main.ts (ou módulo raiz)
app.useGlobalFilters(new GraphQLExceptionFilter());
```

Regras associadas:

- `formatError` do Apollo/Yoga deve ser configurado para **remover `extensions.exception.stacktrace`** por padrão em produção (o filtro acima já não a inclui, mas isso é uma segunda camada de defesa em profundidade caso alguma exceção escape do filtro).
- Nenhuma mensagem de erro deve incluir nome de tabela, coluna, query SQL ou path de arquivo — testar isso explicitamente em testes de integração (buscar por `/prisma|SELECT|node_modules|at .*\.ts:/i` no corpo de resposta de erro).
