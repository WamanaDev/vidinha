import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "@prisma-module/prisma.module";
import { StorageModule } from "@modules/storage/storage.module";
import { SupabaseJwtStrategy } from "./strategies/supabase-jwt.strategy";
import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";

@Module({
  imports: [PassportModule, PrismaModule, StorageModule],
  providers: [SupabaseJwtStrategy, AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
