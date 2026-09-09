import { Module, ValidationPipe } from "@nestjs/common";
import { APP_GUARD, APP_FILTER, APP_PIPE, APP_INTERCEPTOR } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { validate } from "@config/env.validation";
import configuration from "@config/configuration";
import { GraphqlConfigService } from "@config/graphql.config";
import { PrismaModule } from "@prisma-module/prisma.module";
import { AuthModule } from "@auth/auth.module";
import { CaslModule } from "@casl/casl.module";

import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GqlThrottlerGuard } from "@common/guards/gql-throttler.guard";
import { GraphQLExceptionFilter } from "@common/filters/graphql-exception.filter";
import { LoggingInterceptor } from "@common/interceptors/logging.interceptor";
import { AuditLogInterceptor } from "@common/interceptors/audit-log.interceptor";

import { FamilyModule } from "@modules/family/family.module";
import { AuditLogModule } from "@modules/audit-log/audit-log.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "debug",
        redact: ["req.headers.authorization"],
      },
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useClass: GraphqlConfigService,
    }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 120 },
      { name: "auth-sensitive", ttl: 60_000, limit: 5 },
      { name: "invite", ttl: 60_000, limit: 10 },
      { name: "openfinance-sync", ttl: 60_000, limit: 6 },
      { name: "mutation-write", ttl: 60_000, limit: 60 },
    ]),
    PrismaModule,
    AuthModule,
    CaslModule,
    AuditLogModule,
    FamilyModule,
    // SUPOSIÇÃO: open-finance, accounts, cards, transactions, sharing-permissions,
    // recurring-expenses e categories ainda não foram implementados neste bootstrap
    // (fora do escopo desta tarefa — ver specs/backend/00-overview.md §3, passos 6-9).
    // Serão importados aqui à medida que forem implementados.
  ],
  providers: [
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GraphQLExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        forbidUnknownValues: true,
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
