import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { SharingPermissionsModule } from "@modules/sharing-permissions/sharing-permissions.module";
import { AccountsModule } from "@modules/accounts/accounts.module";
import { TransactionsResolver } from "./transactions.resolver";
import { TransactionsService } from "./transactions.service";

@Module({
  imports: [PrismaModule, SharingPermissionsModule, AccountsModule],
  providers: [TransactionsResolver, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
