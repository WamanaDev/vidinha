import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import { ThrottleOpenFinanceSync } from "@common/decorators/throttle-named.decorator";
import { PoliciesGuard } from "@common/guards/policies.guard";
import { AuthUser } from "@common/types/auth-user.type";
import { OpenFinanceService } from "./open-finance.service";
import { CreateOpenFinanceConnectionInput } from "./dto/create-open-finance-connection.input";
import { OpenFinanceConnection } from "./entities/open-finance-connection.entity";
import { PluggyConnectToken } from "./entities/pluggy-connect-token.entity";

@Resolver(() => OpenFinanceConnection)
@UseGuards(PoliciesGuard) // JwtAuthGuard já é global (ver app.module.ts); este guard só resolve CASL
export class OpenFinanceResolver {
  constructor(private readonly openFinanceService: OpenFinanceService) {}

  @Query(() => PluggyConnectToken)
  async pluggyConnectToken(
    @CurrentUser() user: AuthUser,
  ): Promise<PluggyConnectToken> {
    return this.openFinanceService.createConnectToken(user.userId);
  }

  @Query(() => [OpenFinanceConnection])
  async openFinanceConnections(
    @CurrentUser() user: AuthUser,
    @Args("familyId", { type: () => ID }) familyId: string,
  ): Promise<OpenFinanceConnection[]> {
    return this.openFinanceService.findVisibleConnections(
      user.userId,
      familyId,
    );
  }

  @Mutation(() => OpenFinanceConnection)
  async createOpenFinanceConnection(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateOpenFinanceConnectionInput,
  ): Promise<OpenFinanceConnection> {
    return this.openFinanceService.createConnection(user.userId, input);
  }

  @ThrottleOpenFinanceSync()
  @Mutation(() => OpenFinanceConnection)
  async syncOpenFinanceConnection(
    @CurrentUser() user: AuthUser,
    @Args("connectionId", { type: () => ID }) connectionId: string,
  ): Promise<OpenFinanceConnection> {
    return this.openFinanceService.syncConnection(user.userId, connectionId);
  }

  // SUPOSIÇÃO: sem `@CheckAbility()` aqui — a checagem de posse (só o dono
  // revoga) depende do `userId` da própria conexão, não de um `familyId`
  // resolvível estaticamente dos args (a mutation só recebe `connectionId`).
  // O `AbilityFactory` exige `familyId` para montar a ability; como este
  // recurso não pertence a uma família (é pessoal, do usuário), a checagem de
  // posse é feita diretamente no service (`findOwnedConnectionOrThrow`),
  // seguindo a convenção 2.3 de specs/backend/00-overview.md.
  @Mutation(() => Boolean)
  async revokeOpenFinanceConnection(
    @CurrentUser() user: AuthUser,
    @Args("connectionId", { type: () => ID }) connectionId: string,
  ): Promise<boolean> {
    return this.openFinanceService.revokeConnection(user.userId, connectionId);
  }
}
