import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { IS_PUBLIC_KEY } from "@common/decorators/public.decorator";
import { UnauthenticatedAppException } from "@common/errors/app.exceptions";

/**
 * Guard global (APP_GUARD) — fail-secure por padrão: só é contornado por `@Public()`.
 * Ver specs/backend/common/jwt-auth-guard.md §9.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("supabase-jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    return gqlCtx.getContext().req;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw new UnauthenticatedAppException();
    }
    return user;
  }
}
