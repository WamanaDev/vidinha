import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { PinoLogger } from "nestjs-pino";
import { Observable, tap } from "rxjs";

/** Log estruturado por operação GraphQL (nestjs-pino) — ver specs/backend/00-overview.md. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext("GraphQL");
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info({
            operation: info?.fieldName,
            durationMs: Date.now() - started,
          });
        },
        error: (err) => {
          this.logger.warn({
            operation: info?.fieldName,
            durationMs: Date.now() - started,
            err: err?.message,
          });
        },
      }),
    );
  }
}
