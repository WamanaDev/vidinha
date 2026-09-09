import { SetMetadata } from "@nestjs/common";
import { Action } from "@casl/action.enum";

export const CHECK_ABILITY_KEY = "check_ability";

export interface RequiredAbility {
  action: Action;
  subject: string;
  /** Extrai o familyId relevante dos argumentos GraphQL da operação, para a AbilityFactory. */
  resolveFamilyId: (args: Record<string, any>) => string;
}

export const CheckAbility = (ability: RequiredAbility) =>
  SetMetadata(CHECK_ABILITY_KEY, ability);
