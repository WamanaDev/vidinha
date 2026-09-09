import { Test } from "@nestjs/testing";
import { SharingPermissionsService } from "./sharing-permissions.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import { AbilityFactory } from "@casl/ability.factory";
import { ForbiddenAppException } from "@common/errors/app.exceptions";
import { FamilyRole, SharableResourceType } from "@prisma/client";

describe("SharingPermissionsService — update", () => {
  let service: SharingPermissionsService;
  let prisma: {
    sharingPermission: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLog: { record: jest.Mock };
  let abilityFactory: { createForUser: jest.Mock };

  const familyId = "family-1";
  const ownerId = "owner-1";
  const adminId = "admin-1";

  const basePermission = {
    id: "perm-1",
    ownerId,
    familyId,
    resourceType: SharableResourceType.ACCOUNT,
    resourceId: "account-1",
    allowFullDetail: false,
    revokedAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: { id: ownerId, email: "owner@test.com", createdAt: new Date() },
    family: { id: familyId, name: "Família Teste", createdAt: new Date() },
  };

  beforeEach(async () => {
    prisma = {
      sharingPermission: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    auditLog = { record: jest.fn() };
    abilityFactory = { createForUser: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SharingPermissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
        { provide: AbilityFactory, useValue: abilityFactory },
      ],
    }).compile();

    service = moduleRef.get(SharingPermissionsService);
  });

  /** Constrói uma AppAbility real (via AbilityBuilder) para simular as regras
   * do AbilityFactory real, sem depender do Prisma. */
  async function buildAbility(role: FamilyRole, userId: string) {
    const { Ability, AbilityBuilder, detectSubjectType } =
      await import("@casl/ability");
    const { can, cannot, build } = new AbilityBuilder<any>(Ability as any);

    if (role === FamilyRole.ADMIN) {
      can("read", "SharingPermission");
    }
    can("update", "SharingPermission", { ownerId: userId });
    cannot("update", "SharingPermission", { ownerId: { $ne: userId } });
    can("read", "SharingPermission", { ownerId: userId });

    return build({
      detectSubjectType: (item: any) => detectSubjectType(item),
    });
  }

  it("permite que o MEMBER dono edite a própria SharingPermission", async () => {
    prisma.sharingPermission.findUnique.mockResolvedValue({
      ...basePermission,
    });
    abilityFactory.createForUser.mockResolvedValue(
      await buildAbility(FamilyRole.MEMBER, ownerId),
    );
    prisma.sharingPermission.update.mockResolvedValue({
      ...basePermission,
      revokedAt: null,
    });

    const result = await service.update(ownerId, {
      id: "perm-1",
      sharedWithFamily: true,
    });

    expect(result.sharedWithFamily).toBe(true);
    expect(auditLog.record).toHaveBeenCalled();
  });

  it("lança FORBIDDEN quando um MEMBER tenta editar a SharingPermission de outro membro", async () => {
    prisma.sharingPermission.findUnique.mockResolvedValue({
      ...basePermission,
    });
    abilityFactory.createForUser.mockResolvedValue(
      await buildAbility(FamilyRole.MEMBER, "other-member"),
    );

    await expect(
      service.update("other-member", {
        id: "perm-1",
        sharedWithFamily: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenAppException);

    expect(prisma.sharingPermission.update).not.toHaveBeenCalled();
  });

  it("lança FORBIDDEN quando um ADMIN tenta editar a SharingPermission de um membro que não é ele mesmo", async () => {
    prisma.sharingPermission.findUnique.mockResolvedValue({
      ...basePermission,
    });
    // ADMIN só tem Action.Read sobre a permissão de outro, nunca Update.
    abilityFactory.createForUser.mockResolvedValue(
      await buildAbility(FamilyRole.ADMIN, adminId),
    );

    await expect(
      service.update(adminId, {
        id: "perm-1",
        sharedWithFamily: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenAppException);

    expect(prisma.sharingPermission.update).not.toHaveBeenCalled();
  });

  it("corrige automaticamente allowFullDetail para false quando o resultado final está revogado", async () => {
    prisma.sharingPermission.findUnique.mockResolvedValue({
      ...basePermission,
      allowFullDetail: true,
      revokedAt: null,
    });
    abilityFactory.createForUser.mockResolvedValue(
      await buildAbility(FamilyRole.MEMBER, ownerId),
    );
    prisma.sharingPermission.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        ...basePermission,
        allowFullDetail:
          data.allowFullDetail !== undefined
            ? data.allowFullDetail
            : basePermission.allowFullDetail,
        revokedAt:
          data.revokedAt !== undefined
            ? data.revokedAt
            : basePermission.revokedAt,
      }),
    );

    const result = await service.update(ownerId, {
      id: "perm-1",
      sharedWithFamily: false,
    });

    expect(result.fullDetailShared).toBe(false);
    expect(result.sharedWithFamily).toBe(false);
    expect(prisma.sharingPermission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ allowFullDetail: false }),
      }),
    );
  });

  it("não lança erro ao definir fullDetailShared:true junto com sharedWithFamily:false — apenas corrige o estado final", async () => {
    prisma.sharingPermission.findUnique.mockResolvedValue({
      ...basePermission,
      allowFullDetail: false,
      revokedAt: null,
    });
    abilityFactory.createForUser.mockResolvedValue(
      await buildAbility(FamilyRole.MEMBER, ownerId),
    );
    prisma.sharingPermission.update.mockImplementation(({ data }: any) =>
      Promise.resolve({
        ...basePermission,
        allowFullDetail:
          data.allowFullDetail !== undefined
            ? data.allowFullDetail
            : basePermission.allowFullDetail,
        revokedAt:
          data.revokedAt !== undefined
            ? data.revokedAt
            : basePermission.revokedAt,
      }),
    );

    await expect(
      service.update(ownerId, {
        id: "perm-1",
        sharedWithFamily: false,
        fullDetailShared: true,
      }),
    ).resolves.toMatchObject({
      fullDetailShared: false,
      sharedWithFamily: false,
    });
  });
});
