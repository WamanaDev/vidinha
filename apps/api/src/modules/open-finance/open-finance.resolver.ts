import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "@common/decorators/current-user.decorator";
import {
  ThrottleAuthSensitive,
  ThrottleOpenFinanceSync,
} from "@common/decorators/throttle-named.decorator";
import { PoliciesGuard } from "@common/guards/policies.guard";
import { AuthUser } from "@common/types/auth-user.type";
import { OpenFinanceService } from "./open-finance.service";
import { CreateOpenFinanceItemInput } from "./dto/create-open-finance-item.input";
import { SendOpenFinanceItemMfaInput } from "./dto/send-open-finance-item-mfa.input";
import { OpenFinanceConnection } from "./entities/open-finance-connection.entity";
import { OpenFinanceConnector } from "./entities/open-finance-connector.entity";
import { OpenFinanceItemResult } from "./entities/open-finance-item-result.entity";

@Resolver(() => OpenFinanceConnection)
@UseGuards(PoliciesGuard) // JwtAuthGuard já é global (ver app.module.ts); este guard só resolve CASL
export class OpenFinanceResolver {
  constructor(private readonly openFinanceService: OpenFinanceService) {}

  /**
   * Lista as instituições disponíveis para conexão direta via API (substitui
   * o widget Pluggy Connect). `includeSandbox` default `false` — o app só
   * deve pedir `true` explicitamente em builds de desenvolvimento/QA.
   */
  @Query(() => [OpenFinanceConnector])
  async openFinanceConnectors(
    @Args("includeSandbox", { type: () => Boolean, nullable: true })
    includeSandbox?: boolean,
  ): Promise<OpenFinanceConnector[]> {
    return this.openFinanceService.listConnectors(includeSandbox ?? false);
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

  // SUPOSIÇÃO: sem `@CheckAbility()` aqui — a checagem de "membro ativo da
  // família" é feita diretamente no service
  // (`assertActiveFamilyMemberOrForbidden`), assim como o restante do módulo
  // (ver `revokeOpenFinanceConnection` abaixo e convenção 2.3 de
  // specs/backend/00-overview.md). `@ThrottleAuthSensitive()` é aplicado
  // porque esta mutation efetivamente repassa uma tentativa de login bancário
  // à Pluggy — sem rate limit aqui, o nosso backend vira proxy de força bruta.
  @ThrottleAuthSensitive()
  @Mutation(() => OpenFinanceItemResult)
  async createOpenFinanceItem(
    @CurrentUser() user: AuthUser,
    @Args("input") input: CreateOpenFinanceItemInput,
  ): Promise<OpenFinanceItemResult> {
    return this.openFinanceService.createItem(user.userId, input);
  }

  @ThrottleAuthSensitive()
  @Mutation(() => OpenFinanceItemResult)
  async sendOpenFinanceItemMfa(
    @CurrentUser() user: AuthUser,
    @Args("input") input: SendOpenFinanceItemMfaInput,
  ): Promise<OpenFinanceItemResult> {
    return this.openFinanceService.sendItemMfa(user.userId, input);
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
