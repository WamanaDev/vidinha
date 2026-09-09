import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AbilityFactory } from "@casl/ability.factory";
import {
  CHECK_ABILITY_KEY,
  RequiredAbility,
} from "@common/decorators/check-ability.decorator";
import { ForbiddenAppException } from "@common/errors/app.exceptions";

/**
 * Executa a checagem de ability declarada via `@CheckAbility()`.
 * Ver specs/backend/common/casl-ability-factory.md §5.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<RequiredAbility | undefined>(
      CHECK_ABILITY_KEY,
      context.getHandler(),
    );
    if (!required) return true; // resolver sem @CheckAbility() — controle de acesso feito manualmente no service

    const gqlCtx = GqlExecutionContext.create(context);
    const { user } = gqlCtx.getContext().req;
    const args = gqlCtx.getArgs();
    const familyId = required.resolveFamilyId(args);

    const ability = await this.abilityFactory.createForUser(
      user.userId,
      familyId,
    );
    if (!ability.can(required.action, required.subject)) {
      throw new ForbiddenAppException(
        "Você não tem permissão para executar esta ação.",
      );
    }
    return true;
  }
}
