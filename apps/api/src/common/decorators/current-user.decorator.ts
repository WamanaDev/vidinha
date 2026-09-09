import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthUser } from "@common/types/auth-user.type";

/** Extrai `context.req.user`, populado pelo `JwtAuthGuard`/`SupabaseJwtStrategy`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const gqlCtx = GqlExecutionContext.create(context);
    return gqlCtx.getContext().req.user;
  },
);
