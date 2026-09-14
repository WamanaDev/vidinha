import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { StorageModule } from "@modules/storage/storage.module";
import { RecurringExpensesResolver } from "./recurring-expenses.resolver";
import { RecurringExpensesService } from "./recurring-expenses.service";

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [RecurringExpensesResolver, RecurringExpensesService],
  exports: [RecurringExpensesService],
})
export class RecurringExpensesModule {}
