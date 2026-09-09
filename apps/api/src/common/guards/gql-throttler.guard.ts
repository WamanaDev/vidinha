import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { GqlExecutionContext } from "@nestjs/graphql";

/**
 * Adapta `@nestjs/throttler` ao contexto GraphQL (todo o tráfego entra por `/graphql`).
 * Chave de limitação: `userId` do JWT quando autenticado, IP como fallback
 * (ver specs/backend/common/rate-limiting.md).
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.userId ?? req.ip;
  }
}
