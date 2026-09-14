import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { CaslModule } from "@casl/casl.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { StorageModule } from "@modules/storage/storage.module";
import { FamilyResolver } from "./family.resolver";
import { FamilyService } from "./family.service";

@Module({
  imports: [PrismaModule, CaslModule, AuditLogModule, StorageModule],
  providers: [FamilyResolver, FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
