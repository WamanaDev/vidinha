import { Test } from "@nestjs/testing";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { AuditLogService } from "./audit-log.service";

describe("AuditLogService", () => {
  let service: AuditLogService;
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AuditLogService);
  });

  it("persiste um registro de auditoria com os campos informados", async () => {
    await service.record({
      actorId: "user-1",
      familyId: "family-1",
      action: AuditAction.FAMILY_CREATED,
      metadata: { name: "Família Teste" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        familyId: "family-1",
        action: AuditAction.FAMILY_CREATED,
        metadata: { name: "Família Teste" },
      },
    });
  });

  it("usa null quando actorId/familyId não são informados (evento de sistema)", async () => {
    await service.record({ action: AuditAction.LOGIN });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        familyId: null,
        action: AuditAction.LOGIN,
        metadata: undefined,
      },
    });
  });
});
