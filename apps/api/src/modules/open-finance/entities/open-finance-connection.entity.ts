import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";
import { ConnectionStatus } from "@prisma/client";
import { Account } from "@modules/accounts/entities/account.entity";

// SUPOSIÇÃO: o enum GraphQL espelha 1:1 o `ConnectionStatus` do Prisma
// (CONNECTED, UPDATING, LOGIN_ERROR, OUTDATED, ERROR, REVOKED), que é a fonte
// de verdade (specs/data-model/schema.prisma). Isso diverge dos valores citados
// no SDL de exemplo em open-finance.module.md §1 (CONNECTING/UPDATED, sem ERROR),
// que foi extraído de specs/02-API-AUTH.md antes da definição final do schema —
// seguimos o schema Prisma por instrução explícita do agente (nomes de
// models/enums/campos são exatos, não invente nomes alternativos).
registerEnumType(ConnectionStatus, { name: "ConnectionStatus" });

@ObjectType()
export class OpenFinanceConnection {
  @Field(() => ID)
  id!: string;

  @Field()
  institutionName!: string;

  @Field({ nullable: true })
  institutionLogoUrl?: string;

  @Field(() => ConnectionStatus)
  status!: ConnectionStatus;

  @Field({ nullable: true })
  lastSyncedAt?: Date;

  @Field()
  createdAt!: Date;

  @Field(() => [Account])
  accounts!: Account[];
}
