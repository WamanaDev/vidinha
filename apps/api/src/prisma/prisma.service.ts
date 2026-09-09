import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Singleton por processo/módulo Nest, reaproveitado entre invocações do mesmo
 * container "morno" na Vercel Serverless. DATABASE_URL aponta para a connection
 * string pooled (PgBouncer, porta 6543) em staging/produção.
 * Ver specs/backend/common/vercel-serverless-handler.md §2.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: { db: { url: process.env.DATABASE_URL } },
      log:
        process.env.NODE_ENV === "development"
          ? ["warn", "error"]
          : ["warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
