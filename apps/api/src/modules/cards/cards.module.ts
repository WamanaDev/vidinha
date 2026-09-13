import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { SharingPermissionsModule } from "@modules/sharing-permissions/sharing-permissions.module";
import { CardsResolver } from "./cards.resolver";
import { CardsService } from "./cards.service";

@Module({
  imports: [PrismaModule, SharingPermissionsModule],
  providers: [CardsResolver, CardsService],
  exports: [CardsService],
})
export class CardsModule {}
