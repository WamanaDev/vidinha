import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { CaslModule } from "@casl/casl.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { OpenFinanceResolver } from "./open-finance.resolver";
import { OpenFinanceService } from "./open-finance.service";
import { PluggyClientService } from "./pluggy-client.service";

@Module({
  imports: [PrismaModule, CaslModule, AuditLogModule],
  providers: [OpenFinanceResolver, OpenFinanceService, PluggyClientService],
  exports: [OpenFinanceService, PluggyClientService],
})
export class OpenFinanceModule {}
