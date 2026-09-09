import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { SharingPermissionsService } from "./sharing-permissions.service";
import { UpdateSharingPermissionInput } from "./dto/update-sharing-permission.input";
import { SharingPermission } from "./entities/sharing-permission.entity";

/**
 * Autorização de leitura (`sharingPermissions`) é resolvida dentro do service
 * via `AbilityFactory` (ADMIN vê todas, MEMBER só as próprias). A mutation
 * `updateSharingPermission` não usa `@CheckAbility()`/`PoliciesGuard` porque a
 * checagem depende de atributos da instância buscada (`ownerId` do registro
 * específico), não apenas do papel do usuário na família — por isso a
 * checagem via `ForbiddenError.from(ability).throwUnlessCan(...)` acontece
 * dentro do service, como no exemplo de
 * specs/backend/common/casl-ability-factory.md §3.
 */
@Resolver(() => SharingPermission)
export class SharingPermissionsResolver {
  constructor(
    private readonly sharingPermissionsService: SharingPermissionsService,
  ) {}

  @Query(() => [SharingPermission])
  async sharingPermissions(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<SharingPermission[]> {
    return this.sharingPermissionsService.findByFamily(user.userId, familyId);
  }

  @Mutation(() => SharingPermission)
  async updateSharingPermission(
    @CurrentUser() user: AuthUser,
    @Args("input") input: UpdateSharingPermissionInput,
  ): Promise<SharingPermission> {
    return this.sharingPermissionsService.update(user.userId, input);
  }
}
