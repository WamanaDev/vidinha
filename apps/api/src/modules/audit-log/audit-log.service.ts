import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";

export interface RecordAuditLogInput {
  actorId?: string | null;
  familyId?: string | null;
  action: AuditAction;
  /** Nunca deve conter tokens/credenciais — ver specs/backend/modules/audit-log/audit-log.module.md §2. */
  metadata?: Record<string, unknown>;
}

/**
 * Sem resolver público no MVP (uso interno, PoLP) — consumido diretamente
 * pelos services de domínio (padrão manual explícito, ver
 * specs/backend/modules/audit-log/audit-log.module.md §3).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        familyId: input.familyId ?? null,
        action: input.action,
        metadata: input.metadata as any,
      },
    });
  }
}
