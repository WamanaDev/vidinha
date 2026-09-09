import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { CaslModule } from "@casl/casl.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { SharingPermissionsResolver } from "./sharing-permissions.resolver";
import { SharingPermissionsService } from "./sharing-permissions.service";

@Module({
  imports: [PrismaModule, CaslModule, AuditLogModule],
  providers: [SharingPermissionsResolver, SharingPermissionsService],
  exports: [SharingPermissionsService],
})
export class SharingPermissionsModule {}
