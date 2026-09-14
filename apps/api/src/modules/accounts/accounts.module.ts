import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { SharingPermissionsModule } from "@modules/sharing-permissions/sharing-permissions.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { AccountsResolver } from "./accounts.resolver";
import { AccountsService } from "./accounts.service";

@Module({
  imports: [PrismaModule, SharingPermissionsModule, AuditLogModule],
  providers: [AccountsResolver, AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
