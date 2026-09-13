import { Module } from "@nestjs/common";
import { PrismaModule } from "@prisma-module/prisma.module";
import { SharingPermissionsModule } from "@modules/sharing-permissions/sharing-permissions.module";
import { CategoriesResolver } from "./categories.resolver";
import { CategoriesService } from "./categories.service";

@Module({
  imports: [PrismaModule, SharingPermissionsModule],
  providers: [CategoriesResolver, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
