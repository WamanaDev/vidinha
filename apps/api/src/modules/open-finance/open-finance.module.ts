import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { CaslModule } from "@casl/casl.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";
import { AccountsModule } from "@modules/accounts/accounts.module";
import { OpenFinanceResolver } from "./open-finance.resolver";
import { OpenFinanceService } from "./open-finance.service";
import { PluggyClientService } from "./pluggy-client.service";

@Module({
  // AccountsModule é importado para reusar `AccountsService#toEntity` ao
  // mapear `OpenFinanceConnection.accounts` (evita uma segunda implementação
  // do mapeamento Account -> GraphQL, ver open-finance.service.ts#toEntity).
  imports: [PrismaModule, CaslModule, AuditLogModule, AccountsModule],
  providers: [OpenFinanceResolver, OpenFinanceService, PluggyClientService],
  exports: [OpenFinanceService, PluggyClientService],
})
export class OpenFinanceModule {}
