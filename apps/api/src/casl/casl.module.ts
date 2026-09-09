import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { AbilityFactory } from "./ability.factory";

@Module({
  imports: [PrismaModule],
  providers: [AbilityFactory],
  exports: [AbilityFactory],
})
export class CaslModule {}
