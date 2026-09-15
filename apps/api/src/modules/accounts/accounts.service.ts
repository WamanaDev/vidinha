import { Injectable } from "@nestjs/common";
import {
  AuditAction,
  SharableResourceType,
  SharingPermission as PrismaSharingPermission,
  Account as PrismaAccount,
  User as PrismaUser,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { SharingPermissionsService } from "@modules/sharing-permissions/sharing-permissions.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { SupabaseStorageService } from "@modules/storage/storage.service";
import { OpenFinanceConnection } from "@modules/open-finance/entities/open-finance-connection.entity";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { UpdateAccountSharingInput } from "./dto/update-account-sharing.input";
import { CreateAccountInput } from "./dto/create-account.input";
import { UpdateAccountInput } from "./dto/update-account.input";
import { Account } from "./entities/account.entity";

type AccountWithOwner = PrismaAccount & { owner: PrismaUser };

/**
 * Autorização de leitura (`accounts(familyId)`) e a checagem de posse em
 * `updateAccountSharing` (só o dono) são resolvidas com queries Prisma
 * explícitas dentro deste service, NÃO via `AbilityFactory`/CASL — mesma
 * convenção já usada por `OpenFinanceService#revokeConnection` (ver
 * `open-finance.service.ts#findOwnedConnectionOrThrow`). Motivo: `Account`
 * não pertence estruturalmente a uma `Family` (o `ownerId` é um `User`); a
 * regra de visibilidade cruza duas fontes (membros ativos da família +
 * `SharingPermission` do recurso) que não se expressam bem como um atributo
 * estático da instância para o `AbilityFactory` sem reconsultar o Prisma de
 * qualquer forma — mantendo a lógica aqui evita duplicar a busca de
 * `SharingPermission` em dois lugares (CASL e service).
 */
@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharingPermissions: SharingPermissionsService,
    private readonly auditLog: AuditLogService,
    private readonly storage: SupabaseStorageService,
  ) {}

  /**
   * Lista as contas visíveis ao usuário dentro de uma família: o dono sempre
   * vê as próprias contas; os demais membros ativos da família só veem
   * contas com `SharingPermission` ativa (`resourceType: 'ACCOUNT'`,
   * `revokedAt: null`).
   */
  async findByFamily(userId: string, familyId: string): Promise<Account[]> {
    await this.assertActiveFamilyMember(familyId, userId);

    const memberIds = (
      await this.prisma.familyMember.findMany({
        where: { familyId, removedAt: null },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const accounts = await this.prisma.account.findMany({
      where: { ownerId: { in: memberIds }, archivedAt: null },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });

    const permissionsByAccountId =
      await this.sharingPermissions.findActiveByResourceIds(
        familyId,
        SharableResourceType.ACCOUNT,
        accounts.map((a) => a.id),
      );

    const visible = accounts.filter(
      (a) => a.ownerId === userId || permissionsByAccountId.has(a.id),
    );

    return Promise.all(
      visible.map((a) => this.toEntity(a, permissionsByAccountId.get(a.id))),
    );
  }

  /**
   * Atualiza `sharedWithFamily`/`fullDetailShared` de uma conta via upsert do
   * `SharingPermission` correspondente (reusa
   * `SharingPermissionsService#upsertForResource` — fonte única de verdade,
   * nunca duplicamos a lógica de update aqui). Só o dono da conta pode
   * executar esta mutation.
   */
  async updateSharing(
    userId: string,
    input: UpdateAccountSharingInput,
  ): Promise<Account> {
    const account = await this.findOwnedAccountOrThrow(input.accountId, userId);

    const familyId = await this.resolveOwnerFamilyId(userId);

    const permission = await this.sharingPermissions.upsertForResource({
      actorId: userId,
      ownerId: userId,
      familyId,
      resourceType: SharableResourceType.ACCOUNT,
      resourceId: account.id,
      sharedWithFamily: input.sharedWithFamily,
      fullDetailShared: input.fullDetailShared,
    });

    return this.toEntity(account, permission);
  }

  /**
   * Cadastra uma conta manual (sem Open Finance) — "Carteira" (CASH),
   * "Carteira digital" (CRYPTO) ou qualquer outro `AccountType`. Sempre
   * criada com `isManual: true` e `connectionId: null`. `familyId` só serve
   * para checar que o chamador é membro ativo (mesma convenção de
   * `RecurringExpensesService#create`) — a conta em si pertence ao usuário
   * (`ownerId`), nasce privada (sem `SharingPermission`), igual a qualquer
   * outra conta nova no sistema (compartilhamento é sempre um passo manual
   * posterior via `updateAccountSharing`).
   */
  async create(userId: string, input: CreateAccountInput): Promise<Account> {
    await this.assertActiveFamilyMember(input.familyId, userId);

    const created = await this.prisma.account.create({
      data: {
        ownerId: userId,
        type: input.type,
        name: input.name,
        maskedNumber: input.maskedNumber,
        currency: input.currency ?? "BRL",
        balance: input.balance,
        balanceUpdatedAt: new Date(),
        isManual: true,
        connectionId: null,
      },
      include: { owner: true },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId: input.familyId,
      action: AuditAction.ACCOUNT_CREATED,
      metadata: { accountId: created.id, type: created.type },
    });

    return this.toEntity(created);
  }

  /**
   * Edita uma conta manual. Só o dono pode executar, e somente se
   * `isManual === true` — uma conta sincronizada via Open Finance é
   * somente leitura (exceto compartilhamento, já coberto por
   * `updateSharing`), pois seus dados vêm da instituição financeira real.
   */
  async updateManual(
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account> {
    const account = await this.findOwnedAccountOrThrow(input.id, userId);
    this.assertManual(account);

    const familyId = await this.resolveOwnerFamilyId(userId);

    const updated = await this.prisma.account.update({
      where: { id: account.id },
      data: {
        name: input.name,
        maskedNumber: input.maskedNumber,
        currency: input.currency,
        balance: input.balance,
        balanceUpdatedAt: input.balance !== undefined ? new Date() : undefined,
      },
      include: { owner: true },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId,
      action: AuditAction.ACCOUNT_UPDATED,
      metadata: { accountId: updated.id },
    });

    return this.toEntity(updated);
  }

  /**
   * Soft-delete (`archivedAt`) de uma conta — manual OU sincronizada via
   * Open Finance. Só o dono pode executar. Ao contrário de `updateManual`
   * (só permite editar dado bruto de conta manual), arquivar é permitido
   * para qualquer conta: o usuário pode querer "excluir"/esconder uma conta
   * específica trazida por uma instituição sem precisar desconectar a
   * instituição inteira (que poderia trazer outras contas). Contas
   * arquivadas param de aparecer em `accounts(familyId)` (já filtrado por
   * `archivedAt: null`), preservando o histórico de transações; um resync
   * futuro da mesma instituição não reverte o arquivamento — o `upsert` de
   * `OpenFinanceService#upsertAccountFromPluggyAccount` nunca escreve
   * `archivedAt`.
   */
  async archive(userId: string, id: string): Promise<boolean> {
    const account = await this.findOwnedAccountOrThrow(id, userId);

    const familyId = await this.resolveOwnerFamilyId(userId);

    await this.prisma.account.update({
      where: { id: account.id },
      data: { archivedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId,
      action: AuditAction.ACCOUNT_ARCHIVED,
      metadata: { accountId: account.id },
    });

    return true;
  }

  /**
   * Mapeia o model Prisma `Account` (com `owner` incluído) para o
   * `Account` ObjectType GraphQL, calculando `sharedWithFamily`/
   * `fullDetailShared` a partir da `SharingPermission` ativa (ou `undefined`
   * se nenhuma existir/estiver revogada). Público para reuso por
   * `OpenFinanceService` ao popular `OpenFinanceConnection.accounts` (ver
   * `open-finance.service.ts#toEntity`), evitando uma segunda implementação
   * do mesmo mapeamento Account -> GraphQL.
   */
  async toEntity(
    account: AccountWithOwner,
    permission?: PrismaSharingPermission,
  ): Promise<Account> {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance: Number(account.balance),
      currency: account.currency,
      connection: await this.resolveConnection(account.connectionId),
      sharedWithFamily: permission ? permission.revokedAt === null : false,
      fullDetailShared: permission?.allowFullDetail ?? false,
      owner: {
        id: account.owner.id,
        email: account.owner.email,
        displayName: account.owner.displayName ?? undefined,
        avatarUrl: await this.storage.resolveAvatarUrl(account.owner.avatarUrl),
        mfaEnabled: false,
        createdAt: account.owner.createdAt,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async assertActiveFamilyMember(
    familyId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      throw new NotFoundAppException("Família não encontrada.");
    }
  }

  private async findOwnedAccountOrThrow(
    accountId: string,
    userId: string,
  ): Promise<AccountWithOwner> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { owner: true },
    });
    if (!account) {
      throw new NotFoundAppException("Conta não encontrada.");
    }
    if (account.ownerId !== userId) {
      throw new ForbiddenAppException(
        "Somente o dono da conta pode executar esta ação.",
      );
    }
    return account;
  }

  /**
   * Contas sincronizadas via Open Finance (`isManual: false`) são somente
   * leitura, exceto compartilhamento (`updateSharing`) — editar/arquivar
   * exige `isManual: true`.
   */
  private assertManual(account: PrismaAccount): void {
    if (!account.isManual) {
      throw new ForbiddenAppException(
        "Somente contas cadastradas manualmente podem ser editadas ou arquivadas.",
      );
    }
  }

  /**
   * SUPOSIÇÃO: `UpdateAccountSharingInput` (contrato SDL,
   * accounts.module.md §1) não recebe `familyId`, mas `SharingPermission`
   * exige um. O modelo de compartilhamento (specs/00-DECISIONS.md §5) ainda
   * não define se um usuário pode pertencer a mais de uma família
   * simultaneamente. Adotamos aqui, de forma conservadora, a primeira
   * família ativa do dono (`FamilyMember` mais antigo não removido) —
   * comportamento correto no cenário atual de uma família por usuário; se o
   * produto adotar multi-família no futuro, o contrato desta mutation
   * precisará ganhar um campo `familyId` explícito.
   */
  private async resolveOwnerFamilyId(userId: string): Promise<string> {
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, removedAt: null },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      throw new ForbiddenAppException(
        "Você precisa pertencer a uma família para compartilhar contas.",
      );
    }
    return membership.familyId;
  }

  /**
   * Resolve o `OpenFinanceConnection` (com campos mínimos) associado a uma
   * conta, se houver. `accounts` do objeto retornado fica vazio
   * (SUPOSIÇÃO: mesma convenção conservadora de
   * `sharing-permissions.service.ts#toEntity`, que também embute um `Family`
   * parcial sem `members` — evita uma segunda consulta recursiva desta
   * mesma lista de contas).
   */
  private async resolveConnection(
    connectionId: string | null,
  ): Promise<OpenFinanceConnection | undefined> {
    if (!connectionId) return undefined;

    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { id: connectionId },
      include: { institution: true },
    });
    if (!connection) return undefined;

    return {
      id: connection.id,
      institutionName: connection.institution.name,
      institutionLogoUrl: connection.institution.imageUrl ?? undefined,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt ?? undefined,
      createdAt: connection.createdAt,
      accounts: [],
    };
  }
}
