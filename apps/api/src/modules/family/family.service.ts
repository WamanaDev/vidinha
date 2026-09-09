import { Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import {
  FamilyRole,
  FamilyInviteStatus,
  AuditAction,
  Family as PrismaFamily,
  FamilyMember as PrismaFamilyMember,
  FamilyInvite as PrismaFamilyInvite,
  User as PrismaUser,
} from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { CreateFamilyInput } from "./dto/create-family.input";
import { InviteFamilyMemberInput } from "./dto/invite-family-member.input";
import { AcceptInviteInput } from "./dto/accept-invite.input";
import { RemoveMemberInput } from "./dto/remove-member.input";
import { PromoteMemberInput } from "./dto/promote-member.input";
import { Family } from "./entities/family.entity";
import { FamilyMembership } from "./entities/family-membership.entity";
import { FamilyInvite, InviteStatus } from "./entities/family-invite.entity";

// SUPOSIÇÃO: prazo de expiração de convites não definido em 00-DECISIONS.md — 7 dias
// (ver specs/backend/00-overview.md, Suposições, item 5).
const INVITE_EXPIRATION_DAYS = 7;

type FamilyWithMembers = PrismaFamily & {
  members: (PrismaFamilyMember & { user: PrismaUser })[];
};
type MembershipWithRelations = PrismaFamilyMember & {
  user: PrismaUser;
  family: FamilyWithMembers;
};
type InviteWithRelations = PrismaFamilyInvite & {
  family: PrismaFamily;
  invitedBy: PrismaUser;
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Lista as famílias de que o usuário autenticado participa ativamente. */
  async findMyFamilies(userId: string): Promise<FamilyMembership[]> {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId, removedAt: null },
      include: {
        user: true,
        family: {
          include: {
            members: { where: { removedAt: null }, include: { user: true } },
          },
        },
      },
    });
    return memberships.map((m) =>
      this.toMembershipEntity(m as MembershipWithRelations),
    );
  }

  async findFamily(userId: string, familyId: string): Promise<Family> {
    await this.assertActiveMember(familyId, userId);
    return this.findFamilyOrThrow(familyId, userId);
  }

  /** Cria uma família; quem cria é automaticamente o primeiro ADMIN (00-DECISIONS §1). */
  async createFamily(
    userId: string,
    input: CreateFamilyInput,
  ): Promise<Family> {
    const created = await this.prisma.$transaction(async (tx) => {
      return tx.family.create({
        data: {
          name: input.name,
          members: { create: { userId, role: FamilyRole.ADMIN } },
        },
        include: { members: { include: { user: true } } },
      });
    });

    await this.auditLog.record({
      actorId: userId,
      familyId: created.id,
      action: AuditAction.FAMILY_CREATED,
      metadata: { name: created.name },
    });

    return this.toFamilyEntity(created as FamilyWithMembers, userId);
  }

  /** Convida um membro por e-mail. Só ADMIN pode convidar (checado via CASL no resolver). */
  async inviteMember(
    userId: string,
    input: InviteFamilyMemberInput,
  ): Promise<{ invite: FamilyInvite; rawToken: string }> {
    await this.assertActiveMember(input.familyId, userId);

    const existingMember = await this.prisma.familyMember.findFirst({
      where: {
        familyId: input.familyId,
        removedAt: null,
        user: { email: input.email },
      },
    });
    if (existingMember) {
      throw new ConflictAppException(
        "Este e-mail já pertence a um membro da família.",
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    const invite = await this.prisma.familyInvite.create({
      data: {
        familyId: input.familyId,
        invitedById: userId,
        email: input.email,
        token: hashedToken,
        expiresAt: new Date(
          Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
      include: { family: true, invitedBy: true },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId: input.familyId,
      action: AuditAction.FAMILY_INVITE_CREATED,
      metadata: { email: input.email },
    });

    // rawToken (não o hash) é o que vai no e-mail enviado ao convidado — envio de
    // e-mail está fora do escopo deste bootstrap (nenhum provedor definido nas specs).
    return {
      invite: this.toInviteEntity(invite as InviteWithRelations),
      rawToken,
    };
  }

  /**
   * Aceita um convite pendente pelo token bruto (comparado por hash), criando o
   * `FamilyMember`. Idempotente: convite já aceito não recria o vínculo.
   * SUPOSIÇÃO: sem código de exemplo nas specs originais — implementado seguindo
   * o mesmo padrão de service do restante do módulo (ver invite-member.md, nota final).
   */
  async acceptInvite(
    userId: string,
    input: AcceptInviteInput,
  ): Promise<Family> {
    const hashedToken = createHash("sha256")
      .update(input.inviteToken)
      .digest("hex");
    const invite = await this.prisma.familyInvite.findUnique({
      where: { token: hashedToken },
    });
    if (!invite) throw new NotFoundAppException("Convite não encontrado.");

    if (invite.status === FamilyInviteStatus.ACCEPTED) {
      return this.findFamilyOrThrow(invite.familyId, userId);
    }
    if (invite.status !== FamilyInviteStatus.PENDING) {
      throw new ConflictAppException("Este convite não está mais disponível.");
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.familyInvite.update({
        where: { id: invite.id },
        data: { status: FamilyInviteStatus.EXPIRED },
      });
      throw new ConflictAppException("Este convite expirou.");
    }

    await this.prisma.$transaction([
      this.prisma.familyMember.upsert({
        where: { familyId_userId: { familyId: invite.familyId, userId } },
        update: { removedAt: null, role: FamilyRole.MEMBER },
        create: { familyId: invite.familyId, userId, role: FamilyRole.MEMBER },
      }),
      this.prisma.familyInvite.update({
        where: { id: invite.id },
        data: { status: FamilyInviteStatus.ACCEPTED, respondedAt: new Date() },
      }),
    ]);

    await this.auditLog.record({
      actorId: userId,
      familyId: invite.familyId,
      action: AuditAction.FAMILY_INVITE_ACCEPTED,
      metadata: { email: invite.email },
    });

    return this.findFamilyOrThrow(invite.familyId, userId);
  }

  /**
   * Remove um membro da família.
   * Regra de negócio central: NÃO é permitido remover o último ADMIN ativo da
   * família (uma família nunca pode ficar sem administrador).
   */
  async removeMember(
    actingUserId: string,
    input: RemoveMemberInput,
  ): Promise<Family> {
    await this.assertActiveMember(input.familyId, actingUserId);

    const membership = await this.prisma.familyMember.findUnique({
      where: { id: input.membershipId },
    });
    if (
      !membership ||
      membership.familyId !== input.familyId ||
      membership.removedAt
    ) {
      throw new NotFoundAppException("Membro não encontrado nesta família.");
    }

    if (membership.role === FamilyRole.ADMIN) {
      const activeAdminCount = await this.prisma.familyMember.count({
        where: {
          familyId: input.familyId,
          role: FamilyRole.ADMIN,
          removedAt: null,
        },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenAppException(
          "Não é possível remover o único administrador da família. Promova outro membro antes.",
        );
      }
    }

    await this.prisma.familyMember.update({
      where: { id: input.membershipId },
      data: { removedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: actingUserId,
      familyId: input.familyId,
      action: AuditAction.FAMILY_MEMBER_REMOVED,
      metadata: {
        removedUserId: membership.userId,
        previousRole: membership.role,
      },
    });

    return this.findFamilyOrThrow(input.familyId, actingUserId);
  }

  /** Promove um MEMBER a ADMIN. Não há regra de "último admin" aqui (promoção só adiciona admins). */
  async promoteMember(
    actingUserId: string,
    input: PromoteMemberInput,
  ): Promise<Family> {
    await this.assertActiveMember(input.familyId, actingUserId);

    const membership = await this.prisma.familyMember.findUnique({
      where: { id: input.membershipId },
    });
    if (
      !membership ||
      membership.familyId !== input.familyId ||
      membership.removedAt
    ) {
      throw new NotFoundAppException("Membro não encontrado nesta família.");
    }
    if (membership.role === FamilyRole.ADMIN) {
      return this.findFamilyOrThrow(input.familyId, actingUserId); // já é admin, idempotente
    }

    await this.prisma.familyMember.update({
      where: { id: input.membershipId },
      data: { role: FamilyRole.ADMIN },
    });

    await this.auditLog.record({
      actorId: actingUserId,
      familyId: input.familyId,
      action: AuditAction.FAMILY_MEMBER_ROLE_CHANGED,
      metadata: {
        targetUserId: membership.userId,
        previousRole: FamilyRole.MEMBER,
        newRole: FamilyRole.ADMIN,
      },
    });

    return this.findFamilyOrThrow(input.familyId, actingUserId);
  }

  /**
   * Usuário sai voluntariamente da própria família.
   * SUPOSIÇÃO: mesma regra do último admin de `removeMember` se aplica — um
   * admin único não pode sair sem antes promover outro membro.
   */
  async leaveFamily(userId: string, familyId: string): Promise<boolean> {
    const membership = await this.assertActiveMember(familyId, userId);

    if (membership.role === FamilyRole.ADMIN) {
      const activeAdminCount = await this.prisma.familyMember.count({
        where: { familyId, role: FamilyRole.ADMIN, removedAt: null },
      });
      if (activeAdminCount <= 1) {
        throw new ForbiddenAppException(
          "Não é possível sair da família sendo o único administrador. Promova outro membro antes.",
        );
      }
    }

    await this.prisma.familyMember.update({
      where: { id: membership.id },
      data: { removedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId,
      action: AuditAction.FAMILY_MEMBER_REMOVED,
      metadata: {
        removedUserId: userId,
        previousRole: membership.role,
        selfInitiated: true,
      },
    });

    return true;
  }

  /**
   * Exclui a família (soft-delete). Exige `aal2` quando o usuário tem MFA
   * habilitado — checagem de step-up feita no resolver/guard (ver
   * specs/backend/common/casl-ability-factory.md §4); aqui apenas a regra de
   * negócio (só ADMIN, via CASL no resolver).
   */
  async deleteFamily(userId: string, familyId: string): Promise<boolean> {
    await this.assertActiveMember(familyId, userId);

    await this.prisma.family.update({
      where: { id: familyId },
      data: { deletedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: userId,
      familyId,
      action: AuditAction.FAMILY_DELETED,
      metadata: {},
    });

    return true;
  }

  // ---------------------------------------------------------------------
  // Helpers privados compartilhados pelo módulo
  // ---------------------------------------------------------------------

  private async assertActiveMember(
    familyId: string,
    userId: string,
  ): Promise<PrismaFamilyMember> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      // NOT_FOUND, não FORBIDDEN — não revelar existência da família a não-membros
      // (ver specs/backend/common/exception-filter.md §2).
      throw new NotFoundAppException("Família não encontrada.");
    }
    return membership;
  }

  private async findFamilyOrThrow(
    familyId: string,
    currentUserId: string,
  ): Promise<Family> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: { where: { removedAt: null }, include: { user: true } },
      },
    });
    if (!family) throw new NotFoundAppException("Família não encontrada.");
    return this.toFamilyEntity(family as FamilyWithMembers, currentUserId);
  }

  private toFamilyEntity(
    family: FamilyWithMembers,
    currentUserId: string,
  ): Family {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt,
      members: family.members.map((m) =>
        this.toMembershipEntity({ ...m, family } as MembershipWithRelations),
      ),
      myRole: family.members.find((m) => m.userId === currentUserId)!.role,
    };
  }

  private toMembershipEntity(
    membership: MembershipWithRelations,
  ): FamilyMembership {
    return {
      id: membership.id,
      family: {
        id: membership.family.id,
        name: membership.family.name,
        createdAt: membership.family.createdAt,
        members: [],
        myRole: membership.role,
      },
      user: {
        id: membership.user.id,
        email: membership.user.email,
        displayName: membership.user.displayName ?? undefined,
        avatarUrl: membership.user.avatarUrl ?? undefined,
        mfaEnabled: false,
        createdAt: membership.user.createdAt,
      },
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  private toInviteEntity(
    invite: InviteWithRelations & { invitedBy: PrismaUser },
  ): FamilyInvite {
    return {
      id: invite.id,
      family: {
        id: invite.family.id,
        name: invite.family.name,
        createdAt: invite.family.createdAt,
        members: [],
        myRole: FamilyRole.MEMBER,
      },
      email: invite.email,
      invitedBy: {
        id: invite.invitedBy.id,
        email: invite.invitedBy.email,
        displayName: invite.invitedBy.displayName ?? undefined,
        avatarUrl: invite.invitedBy.avatarUrl ?? undefined,
        mfaEnabled: false,
        createdAt: invite.invitedBy.createdAt,
      },
      // SUPOSIÇÃO: o enum GraphQL InviteStatus (ver entities/family-invite.entity.ts)
      // tem 4 valores, enquanto o Prisma FamilyInviteStatus tem 5 (inclui DECLINED,
      // ver specs/data-model/schema.prisma). Mapeado para REVOKED por ser o mais
      // próximo semanticamente (convite não será aceito) — divergência entre
      // specs/backend/modules/family/family.module.md e specs/data-model/schema.prisma.
      status: (invite.status === FamilyInviteStatus.DECLINED
        ? InviteStatus.REVOKED
        : invite.status) as unknown as InviteStatus,
      expiresAt: invite.expiresAt,
    };
  }
}
