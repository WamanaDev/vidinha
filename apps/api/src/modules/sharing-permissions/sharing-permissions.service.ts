import { Injectable } from "@nestjs/common";
import { ForbiddenError, subject } from "@casl/ability";
import {
  Prisma,
  FamilyRole,
  AuditAction,
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
