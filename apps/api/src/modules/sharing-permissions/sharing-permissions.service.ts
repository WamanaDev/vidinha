import { Injectable } from "@nestjs/common";
import { ForbiddenError, subject } from "@casl/ability";
import {
  Prisma,
  FamilyRole,
  AuditAction,
  SharableResourceType,
  SharingPermission as PrismaSharingPermission,
  User as PrismaUser,
  Family as PrismaFamily,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { AbilityFactory } from "@casl/ability.factory";
import { Action } from "@casl/action.enum";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { UpdateSharingPermissionInput } from "./dto/update-sharing-permission.input";
import { SharingPermission } from "./entities/sharing-permission.entity";

type SharingPermissionWithRelations = PrismaSharingPermission & {
  owner: PrismaUser;
  family: PrismaFamily;
};

@Injectable()
export class SharingPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  /**
   * Lista as `SharingPermission` de uma família visíveis para o usuário
   * autenticado: ADMIN vê todas (visibilidade administrativa); MEMBER vê
   * apenas as próprias (dono).
   * SUPOSIÇÃO: o rascunho de CASL na spec só cobria `Action.Read` explícito
   * para ADMIN — adicionamos aqui `can(Action.Read, 'SharingPermission', {
   * ownerId: userId })` no AbilityFactory real para que um MEMBER também
   * consiga listar/ver as próprias permissões (necessário para editá-las via
   * app), já que a spec não pretendia impedir isso.
   */
  async findByFamily(
    userId: string,
    familyId: string,
  ): Promise<SharingPermission[]> {
    const ability = await this.abilityFactory.createForUser(userId, familyId);

    const permissions = await this.prisma.sharingPermission.findMany({
      where: { familyId },
      include: { owner: true, family: true },
    });

    return permissions
      .filter((p) => ability.can(Action.Read, subject("SharingPermission", p)))
      .map((p) => this.toEntity(p as SharingPermissionWithRelations));
  }

  /**
   * Atualiza `sharedWithFamily`/`fullDetailShared` de uma `SharingPermission`.
   * Regras de negócio:
   * - Apenas o dono pode editar a própria permissão (checado via CASL); ADMIN
   *   só tem `Action.Read`, nunca `Action.Update`, sobre a permissão de outro.
   * - Transação `Serializable` (00-DECISIONS §4) para evitar corrida entre a
   *   atualização e leituras concorrentes de consolidação familiar.
   * - `allowFullDetail` nunca pode ficar `true` quando o recurso está revogado
   *   (`revokedAt != null`) — corrigido automaticamente, não rejeitado
   *   (SUPOSIÇÃO: abordagem mais simples e conservadora).
   */
  async update(
    userId: string,
    input: UpdateSharingPermissionInput,
  ): Promise<SharingPermission> {
    const existing = await this.prisma.sharingPermission.findUnique({
      where: { id: input.id },
      include: { owner: true, family: true },
    });
    if (!existing) {
      throw new NotFoundAppException(
        "Permissão de compartilhamento não encontrada.",
      );
    }

    const ability = await this.abilityFactory.createForUser(
      userId,
      existing.familyId,
    );
    // ForbiddenError.from(ability).throwUnlessCan lança um erro do @casl/ability,
    // não uma AppException — o GraphQLExceptionFilter trata qualquer erro não
    // mapeado como genérico (ErrorCode.INTERNAL_ERROR), o que vazaria o código
    // errado para o cliente. Por isso convertemos explicitamente para
    // ForbiddenAppException (ErrorCode.FORBIDDEN), mantendo a checagem de
    // autorização centralizada no CASL (nunca checagem manual solta).
    try {
      ForbiddenError.from(ability).throwUnlessCan(
        Action.Update,
        subject("SharingPermission", existing),
      );
    } catch (err) {
      if (err instanceof ForbiddenError) {
        throw new ForbiddenAppException(
          "Você não tem permissão para editar esta permissão de compartilhamento.",
        );
      }
      throw err;
    }

    const wasRevoked = existing.revokedAt !== null;

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const data: Prisma.SharingPermissionUpdateInput = {};

        if (input.sharedWithFamily !== undefined) {
          data.revokedAt = input.sharedWithFamily ? null : new Date();
        }
        if (input.fullDetailShared !== undefined) {
          data.allowFullDetail = input.fullDetailShared;
        }

        // Estado final projetado (sem ainda persistir) para aplicar a regra de
        // correção automática de `allowFullDetail`.
        const finalRevoked =
          data.revokedAt !== undefined
            ? data.revokedAt !== null
            : existing.revokedAt !== null;
        const finalAllowFullDetail =
          data.allowFullDetail !== undefined
            ? (data.allowFullDetail as boolean)
            : existing.allowFullDetail;

        if (finalRevoked && finalAllowFullDetail) {
          data.allowFullDetail = false;
        }

        return tx.sharingPermission.update({
          where: { id: input.id },
          data,
          include: { owner: true, family: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const isNowRevoked = updated.revokedAt !== null;
    // SUPOSIÇÃO: emite SHARING_PERMISSION_REVOKED especificamente na transição
    // ativo -> revogado; qualquer outra alteração (reativação, mudança de
    // allowFullDetail) audita como SHARING_PERMISSION_UPDATED — a spec não
    // detalhava essa distinção, optamos pela regra mais simples e informativa.
    await this.auditLog.record({
      actorId: userId,
      familyId: existing.familyId,
      action:
        !wasRevoked && isNowRevoked
          ? AuditAction.SHARING_PERMISSION_REVOKED
          : AuditAction.SHARING_PERMISSION_UPDATED,
      metadata: {
        sharingPermissionId: updated.id,
        resourceType: updated.resourceType,
        resourceId: updated.resourceId,
        sharedWithFamily: updated.revokedAt === null,
        allowFullDetail: updated.allowFullDetail,
      },
    });

    return this.toEntity(updated as SharingPermissionWithRelations);
  }

  /**
   * Busca as `SharingPermission` ativas (`revokedAt: null`) de uma família
   * para um conjunto de recursos de um mesmo `resourceType`, indexadas por
   * `resourceId`. Reusado por `accounts`/`cards` (e futuramente `categories`)
   * para resolver, em lote, a visibilidade e os campos derivados
   * `sharedWithFamily`/`fullDetailShared` sem repetir a lógica de leitura do
   * `SharingPermission` em cada módulo consumidor.
   */
  async findActiveByResourceIds(
    familyId: string,
    resourceType: SharableResourceType,
    resourceIds: string[],
  ): Promise<Map<string, PrismaSharingPermission>> {
    if (resourceIds.length === 0) return new Map();

    const permissions = await this.prisma.sharingPermission.findMany({
      where: {
        familyId,
        resourceType,
        resourceId: { in: resourceIds },
        revokedAt: null,
      },
    });

    return new Map(permissions.map((p) => [p.resourceId, p]));
  }

  /**
   * Cria ou atualiza (upsert) a `SharingPermission` de um recurso (`Account`/
   * `Card`/`Category`), pela chave única `(ownerId, familyId, resourceType,
   * resourceId)`. Fonte única de verdade para `updateAccountSharing`/
   * `updateCardSharing` — evita duplicar a lógica de update direta no model
   * `Account`/`Card` (nenhum dos dois tem colunas próprias de
   * compartilhamento, ver nota em accounts.module.md/cards.module.md).
   *
   * Reaplica a mesma regra de correção automática de `update()`:
   * `allowFullDetail` nunca fica `true` quando o recurso não está
   * compartilhado (`sharedWithFamily: false`) — corrigido silenciosamente,
   * não rejeitado (SUPOSIÇÃO já registrada em `update()`).
   *
   * Reaproveita também a mesma convenção de auditoria: emite
   * `SHARING_PERMISSION_REVOKED` especificamente na transição ativo ->
   * revogado; qualquer outra alteração (criação, reativação, mudança de
   * `allowFullDetail`) audita como `SHARING_PERMISSION_UPDATED`.
   */
  async upsertForResource(params: {
    actorId: string;
    ownerId: string;
    familyId: string;
    resourceType: SharableResourceType;
    resourceId: string;
    sharedWithFamily: boolean;
    fullDetailShared?: boolean;
  }): Promise<PrismaSharingPermission> {
    const {
      actorId,
      ownerId,
      familyId,
      resourceType,
      resourceId,
      sharedWithFamily,
    } = params;

    const existing = await this.prisma.sharingPermission.findUnique({
      where: {
        ownerId_familyId_resourceType_resourceId: {
          ownerId,
          familyId,
          resourceType,
          resourceId,
        },
      },
    });

    // Um recurso sem `SharingPermission` ainda é tratado como "revogado" para
    // fins da regra de transição de auditoria (nunca foi compartilhado).
    const wasRevoked = existing ? existing.revokedAt !== null : true;

    const requestedAllowFullDetail =
      params.fullDetailShared !== undefined
        ? params.fullDetailShared
        : (existing?.allowFullDetail ?? false);
    const allowFullDetail = sharedWithFamily ? requestedAllowFullDetail : false;
    const revokedAt = sharedWithFamily ? null : new Date();

    const updated = await this.prisma.$transaction(
      async (tx) =>
        tx.sharingPermission.upsert({
          where: {
            ownerId_familyId_resourceType_resourceId: {
              ownerId,
              familyId,
              resourceType,
              resourceId,
            },
          },
          update: { revokedAt, allowFullDetail },
          create: {
            ownerId,
            familyId,
            resourceType,
            resourceId,
            revokedAt,
            allowFullDetail,
          },
        }),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const isNowRevoked = updated.revokedAt !== null;
    await this.auditLog.record({
      actorId,
      familyId,
      action:
        !wasRevoked && isNowRevoked
          ? AuditAction.SHARING_PERMISSION_REVOKED
          : AuditAction.SHARING_PERMISSION_UPDATED,
      metadata: {
        sharingPermissionId: updated.id,
        resourceType: updated.resourceType,
        resourceId: updated.resourceId,
        sharedWithFamily: updated.revokedAt === null,
        allowFullDetail: updated.allowFullDetail,
      },
    });

    return updated;
  }

  private toEntity(
    permission: SharingPermissionWithRelations,
  ): SharingPermission {
    return {
      id: permission.id,
      // SUPOSIÇÃO: `Family.myRole` não é relevante neste contexto (o objeto
      // `family` embutido aqui serve só para expor `id`/`name`, não a família
      // completa) — mesmo padrão conservador usado em
      // `family.service.ts#toInviteEntity` (hardcoded, não consultado).
      family: {
        id: permission.family.id,
        name: permission.family.name,
        createdAt: permission.family.createdAt,
        members: [],
        myRole: FamilyRole.MEMBER,
      },
      owner: {
        id: permission.owner.id,
        email: permission.owner.email,
        displayName: permission.owner.displayName ?? undefined,
        avatarUrl: permission.owner.avatarUrl ?? undefined,
        mfaEnabled: false,
        createdAt: permission.owner.createdAt,
      },
      scope: permission.resourceType,
      targetId: permission.resourceId,
      sharedWithFamily: permission.revokedAt === null,
      fullDetailShared: permission.allowFullDetail,
      updatedAt: permission.updatedAt,
    };
  }
}
