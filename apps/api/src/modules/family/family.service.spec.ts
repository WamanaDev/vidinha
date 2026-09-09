import { Test } from "@nestjs/testing";
import { FamilyService } from "./family.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "@modules/audit-log/audit-log.service";
import {
  ForbiddenAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { FamilyRole } from "@prisma/client";

describe("FamilyService — regra do último admin", () => {
  let service: FamilyService;
  let prisma: {
    familyMember: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    family: {
      findUnique: jest.Mock;
      update: jest.Mock;
      $transaction: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLog: { record: jest.Mock };

  const familyId = "family-1";
  const actingAdminId = "user-admin";

  beforeEach(async () => {
    prisma = {
      familyMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      family: {
        findUnique: jest.fn(),
        update: jest.fn(),
        $transaction: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = moduleRef.get(FamilyService);
  });

  it("impede remover o último ADMIN ativo da família", async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({
        userId: actingAdminId,
        familyId,
        removedAt: null,
        role: FamilyRole.ADMIN,
      }) // assertActiveMember
      .mockResolvedValueOnce({
        id: "membership-target",
        familyId,
        userId: actingAdminId,
        role: FamilyRole.ADMIN,
        removedAt: null,
      }); // membership a ser removido (é o próprio único admin)

    prisma.familyMember.count.mockResolvedValue(1); // só há 1 admin ativo

    await expect(
      service.removeMember(actingAdminId, {
        familyId,
        membershipId: "membership-target",
      }),
    ).rejects.toBeInstanceOf(ForbiddenAppException);

    expect(prisma.familyMember.update).not.toHaveBeenCalled();
  });

  it("permite remover um ADMIN quando há outro ADMIN ativo na família", async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({
        userId: actingAdminId,
        familyId,
        removedAt: null,
        role: FamilyRole.ADMIN,
      })
      .mockResolvedValueOnce({
        id: "membership-target",
        familyId,
        userId: "other-admin",
        role: FamilyRole.ADMIN,
        removedAt: null,
      });

    prisma.familyMember.count.mockResolvedValue(2); // 2 admins ativos
    prisma.familyMember.update.mockResolvedValue({});
    prisma.family.findUnique.mockResolvedValue({
      id: familyId,
      name: "Família Teste",
      createdAt: new Date(),
      members: [
        {
          id: "m1",
          userId: actingAdminId,
          role: FamilyRole.ADMIN,
          joinedAt: new Date(),
          user: {},
        },
      ],
    });

    await expect(
      service.removeMember(actingAdminId, {
        familyId,
        membershipId: "membership-target",
      }),
    ).resolves.toBeDefined();

    expect(prisma.familyMember.update).toHaveBeenCalledWith({
      where: { id: "membership-target" },
      data: { removedAt: expect.any(Date) },
    });
    expect(auditLog.record).toHaveBeenCalled();
  });

  it("permite remover um MEMBER comum sem checar contagem de admins", async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({
        userId: actingAdminId,
        familyId,
        removedAt: null,
        role: FamilyRole.ADMIN,
      })
      .mockResolvedValueOnce({
        id: "membership-target",
        familyId,
        userId: "some-member",
        role: FamilyRole.MEMBER,
        removedAt: null,
      });

    prisma.familyMember.update.mockResolvedValue({});
    prisma.family.findUnique.mockResolvedValue({
      id: familyId,
      name: "Família Teste",
      createdAt: new Date(),
      members: [
        {
          id: "m1",
          userId: actingAdminId,
          role: FamilyRole.ADMIN,
          joinedAt: new Date(),
          user: {},
        },
      ],
    });

    await service.removeMember(actingAdminId, {
      familyId,
      membershipId: "membership-target",
    });

    expect(prisma.familyMember.count).not.toHaveBeenCalled();
    expect(prisma.familyMember.update).toHaveBeenCalled();
  });

  it("lança NOT_FOUND se o membro-alvo não pertence à família informada", async () => {
    prisma.familyMember.findUnique
      .mockResolvedValueOnce({
        userId: actingAdminId,
        familyId,
        removedAt: null,
        role: FamilyRole.ADMIN,
      })
      .mockResolvedValueOnce({
        id: "x",
        familyId: "other-family",
        userId: "u",
        role: FamilyRole.MEMBER,
        removedAt: null,
      });

    await expect(
      service.removeMember(actingAdminId, { familyId, membershipId: "x" }),
    ).rejects.toBeInstanceOf(NotFoundAppException);
  });
});

describe("FamilyService — createFamily", () => {
  let service: FamilyService;
  let prisma: { family: { create: jest.Mock }; $transaction: jest.Mock };
  let auditLog: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      family: { create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    auditLog = { record: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = moduleRef.get(FamilyService);
  });

  it("cria a família com o usuário criador como ADMIN e audita o evento", async () => {
    prisma.family.create.mockResolvedValue({
      id: "family-1",
      name: "Minha Família",
      createdAt: new Date(),
      members: [
        {
          id: "m1",
          userId: "user-1",
          role: FamilyRole.ADMIN,
          joinedAt: new Date(),
          user: { id: "user-1" },
        },
      ],
    });

    const family = await service.createFamily("user-1", {
      name: "Minha Família",
    });

    expect(prisma.family.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Minha Família",
          members: { create: { userId: "user-1", role: FamilyRole.ADMIN } },
        }),
      }),
    );
    expect(family.myRole).toBe(FamilyRole.ADMIN);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "user-1", action: "FAMILY_CREATED" }),
    );
  });
});
