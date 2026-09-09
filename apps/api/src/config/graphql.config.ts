import { ApolloDriverConfig } from "@nestjs/apollo";
import { GqlOptionsFactory } from "@nestjs/graphql";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLExceptionFilter } from "@common/filters/graphql-exception.filter";

/**
 * Config do GraphQLModule: schema code-first (autoSchemaFile), introspection
 * desabilitada em produção, e `formatError` delegado ao mesmo mapeamento do
 * `GraphQLExceptionFilter` (ver specs/backend/common/exception-filter.md).
 */
@Injectable()
export class GraphqlConfigService implements GqlOptionsFactory {
  private readonly logger = new Logger("GraphQL");
  private readonly exceptionFilter = new GraphQLExceptionFilter();

  constructor(private readonly config: ConfigService) {}

  createGqlOptions(): ApolloDriverConfig {
    return {
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      introspection:
        this.config.get<boolean>("GRAPHQL_INTROSPECTION_ENABLED") ??
        this.config.get("NODE_ENV") !== "production",
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      formatError: (formattedError, error) => {
        const original =
          (error as { originalError?: unknown })?.originalError ?? error;
        const gqlError = this.exceptionFilter.catch(original, undefined as any);
        return {
          message: gqlError.message,
          path: formattedError.path,
          extensions: gqlError.extensions,
        };
      },
    };
  }
}
