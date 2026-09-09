import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "@prisma-module/prisma.module";
import { SupabaseJwtStrategy } from "./strategies/supabase-jwt.strategy";
import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";

@Module({
  imports: [PassportModule, PrismaModule],
  providers: [SupabaseJwtStrategy, AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
