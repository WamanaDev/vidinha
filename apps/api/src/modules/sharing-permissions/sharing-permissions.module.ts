import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { CaslModule } from "@casl/casl.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { StorageModule } from "@modules/storage/storage.module";
import { SharingPermissionsResolver } from "./sharing-permissions.resolver";
import { SharingPermissionsService } from "./sharing-permissions.service";

@Module({
  imports: [PrismaModule, CaslModule, AuditLogModule, StorageModule],
  providers: [SharingPermissionsResolver, SharingPermissionsService],
  exports: [SharingPermissionsService],
})
export class SharingPermissionsModule {}
