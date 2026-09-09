import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { ThrottleAuthSensitive } from "@common/decorators/throttle-named.decorator";
import { AuthUser } from "@common/types/auth-user.type";
import { AuthService } from "./auth.service";
import { CompleteProfileInput } from "./dto/complete-profile.input";
import { User } from "./entities/user.entity";
import { DataExportPayload } from "./entities/data-export-payload.entity";

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => User)
  async me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.authService.me(user.userId);
  }

  @ThrottleAuthSensitive()
  @Mutation(() => User)
  async completeUserProfile(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CompleteProfileInput,
  ): Promise<User> {
    return this.authService.completeProfile(user.userId, input);
  }

  @ThrottleAuthSensitive()
  @Mutation(() => Boolean)
  async requestAccountDeletion(
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    return this.authService.requestAccountDeletion(user.userId);
  }

  /**
   * SUPOSIÇÃO: exportação real de dados (job assíncrono + storage temporário)
   * está fora do escopo deste bootstrap. Retorna um payload de placeholder
   * documentando o contrato do SDL (specs/backend/00-overview.md §5).
   */
  @ThrottleAuthSensitive()
  @Mutation(() => DataExportPayload)
  async exportMyData(
    @CurrentUser() _user: AuthUser,
  ): Promise<DataExportPayload> {
    return {
      downloadUrl: "",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
