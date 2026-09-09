# Common — GraphQLExceptionFilter e formato de erro

**Extraído de:** `specs/02-API-AUTH.md §4` (Tratamento de erros). Ver [`../00-overview.md`](../00-overview.md) para o índice completo.

Alinhado ao item 31 do `CLAUDE.md`: nenhum stack trace, caminho interno, query SQL ou detalhe de infraestrutura chega ao cliente.

---

## 1. Formato padronizado

Todo erro GraphQL segue o formato de `extensions` abaixo (formatação central via `formatError` no `GraphQLModule`):

```json
{
  "errors": [
    {
      "message": "Você não tem permissão para editar esta permissão de compartilhamento.",
      "path": ["updateSharingPermission"],
      "extensions": {
        "code": "FORBIDDEN",
        "requestId": "b3f1c2b0-...-9f21"
      }
    }
  ]
}
```

- `message`: texto seguro para exibição ao usuário (nunca a mensagem bruta de exceções internas do Prisma/Node).
- `extensions.code`: enum fechado de códigos (ver seção 2), usado pelo client para tratar casos especiais (ex.: redirecionar para login em `UNAUTHENTICATED`).
- `extensions.requestId`: UUID correlacionável com o log estruturado (`nestjs-pino`) e com o evento correspondente no Sentry — permite suporte investigar sem expor detalhes ao usuário.
- Em `development`, um campo adicional `extensions.debugMessage` (mensagem original) pode ser incluído; **nunca em `staging`/`production`**.

## 2. Códigos de erro

```typescript
// apps/api/src/common/errors/error-codes.enum.ts
export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',       // token ausente, inválido ou expirado
  FORBIDDEN = 'FORBIDDEN',                   // CASL negou a ação
  NOT_FOUND = 'NOT_FOUND',                   // recurso inexistente ou fora do escopo da família (mesma resposta: nunca revelar existência)
  BAD_USER_INPUT = 'BAD_USER_INPUT',         // falha de validação (class-validator nos inputs)
  RATE_LIMITED = 'RATE_LIMITED',             // throttler
  MFA_REQUIRED = 'MFA_REQUIRED',             // ação exige aal2 e usuário não elevou a sessão
  CONFLICT = 'CONFLICT',                     // ex.: convite já aceito, e-mail já membro da família
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',         // falha de comunicação com Pluggy/Supabase
  INTERNAL_ERROR = 'INTERNAL_ERROR',         // fallback — qualquer exceção não mapeada
}
```

Regra importante de segurança por design: quando um recurso existe mas o usuário não tem permissão de vê-lo (ex.: transação de outra família), o resolver retorna **`NOT_FOUND`, não `FORBIDDEN`** — evita vazar por enumeração a existência de recursos de terceiros. `FORBIDDEN` é reservado para casos em que a existência do recurso já é conhecida do usuário (ex.: ele vê a `SharingPermission` na listagem, mas não pode editá-la).

## 3. `app.exceptions.ts` — exceções tipadas por código

Usadas pelos services de todos os módulos de domínio (ver exemplo de uso em [`../modules/family/remove-member.md`](../modules/family/remove-member.md)):

```typescript
// apps/api/src/common/errors/app.exceptions.ts
// ForbiddenAppException, NotFoundAppException, ConflictAppException etc.
// HttpException com `code` (ErrorCode) anexado ao response, consumido pelo formatError abaixo.
```

## 4. Implementação (`formatError`)

```typescript
// apps/api/src/config/graphql.config.ts (trecho relevante)
GraphQLModule.forRoot<ApolloDriverConfig>({
  formatError: (formattedError, error) => {
    const requestId = randomUUID();
    logger.error({ requestId, error }); // log completo, nunca retornado ao client

    const known = extractKnownError(error); // mapeia ForbiddenError (CASL), NotFoundException, etc.
    if (known) {
      return {
        message: known.safeMessage,
        path: formattedError.path,
        extensions: { code: known.code, requestId },
      };
    }

    // qualquer erro não mapeado => genérico, sem detalhes
    return {
      message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
      path: formattedError.path,
      extensions: { code: ErrorCode.INTERNAL_ERROR, requestId },
    };
  },
});
```

Registrado globalmente via `APP_FILTER` (`GraphQLExceptionFilter`, ver `app.module.ts` completo em [`../modules/family/family.module.md`](../modules/family/family.module.md)) — participa da injeção de dependência do Nest para acessar o logger estruturado (`nestjs-pino`) e o Sentry.
