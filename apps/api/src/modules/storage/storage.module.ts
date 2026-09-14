import { Global, Module } from "@nestjs/common";
import { SupabaseStorageService } from "./storage.service";

/**
 * Módulo global (mesma convenção de `PrismaModule`, ver
 * `prisma/prisma.module.ts`): `SupabaseStorageService` é uma dependência de
 * infraestrutura transversal, usada por `AuthModule` e por todo módulo que
 * serializa `avatarUrl` de um `User` (family, accounts, cards, transactions,
 * recurring-expenses, sharing-permissions).
 */
@Global()
@Module({
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class StorageModule {}
