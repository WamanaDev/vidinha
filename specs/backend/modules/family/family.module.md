# Módulo `family` — Visão geral

**Extraído de:** `specs/06-BACKEND-IMPLEMENTATION-GUIDE.md §3` (Exemplo completo do módulo family) e `§4` (Configuração global, que usa `family` como referência de montagem do `app.module.ts`). Ver [`../../00-overview.md`](../../00-overview.md) para o índice completo.

Este é o **módulo de referência de padrão de código** para todos os demais módulos de domínio (`open-finance`, `accounts`, `cards`, `transactions`, `sharing-permissions`, `recurring-expenses`, `categories`, `audit-log`) — eles ainda não têm código de exemplo escrito e devem seguir exatamente a mesma estrutura, convenções de nomenclatura, padrão de DTOs/entities e formato de testes demonstrados aqui.

Domínio mais representativo (RBAC + ABAC). Usa os nomes de queries/mutations definidos no SDL do módulo: `myFamilies`, `createFamily`, `inviteMember`, `removeMember`, `promoteMember`.

Funções deste módulo, documentadas em arquivos dedicados:

- [`create-family.md`](./create-family.md) — mutation `createFamily`.
- [`invite-member.md`](./invite-member.md) — mutation `inviteMember`.
- [`remove-member.md`](./remove-member.md) — mutation `removeMember` (regra do último admin).
- [`promote-admin.md`](./promote-admin.md) — mutation `promoteMember`.

Query `myFamilies` e o SDL completo do domínio estão na seção 2 abaixo.

---

## 1. `family.module.ts`

```typescript
// apps/api/src/modules/family/family.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma-module/prisma.module';
import { CaslModule } from '@casl/casl.module';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { FamilyResolver } from './family.resolver';
import { FamilyService } from './family.service';

@Module({
  imports: [PrismaModule, CaslModule, AuditLogModule],
  providers: [FamilyResolver, FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
```

## 2. SDL GraphQL do domínio `Family`

```graphql
enum FamilyRole {
  ADMIN
  MEMBER
}

type Family implements Node {
  id: ID!
  name: String!
  createdAt: DateTime!
  members: [FamilyMembership!]!
  myRole: FamilyRole!
}

type FamilyMembership implements Node {
  id: ID!
  family: Family!
  user: User!
  role: FamilyRole!
  joinedAt: DateTime!
}

type FamilyInvite implements Node {
  id: ID!
  family: Family!
  email: String!
  invitedBy: User!
  status: InviteStatus!
  expiresAt: DateTime!
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

input CreateFamilyInput {
  name: String!
}

input InviteMemberInput {
  familyId: ID!
  email: String!
}

input AcceptInviteInput {
  inviteToken: String!
}

input RemoveMemberInput {
  familyId: ID!
  membershipId: ID!
}

input PromoteMemberInput {
  familyId: ID!
  membershipId: ID!
}

type FamilyPayload {
  family: Family!
}

type FamilyInvitePayload {
  invite: FamilyInvite!
}

type Query {
  family(id: ID!): Family!
  myFamilies: [FamilyMembership!]!
}

type Mutation {
  createFamily(input: CreateFamilyInput!): FamilyPayload!
  inviteMember(input: InviteMemberInput!): FamilyInvitePayload!
  acceptInvite(input: AcceptInviteInput!): FamilyPayload!
  removeMember(input: RemoveMemberInput!): FamilyPayload!
  promoteMember(input: PromoteMemberInput!): FamilyPayload!
  leaveFamily(familyId: ID!): Boolean!
  deleteFamily(familyId: ID!): Boolean! # requiresAal2 quando MFA habilitado
}
```

## 3. Regras de negócio do domínio (`00-DECISIONS.md §1`)

- Família com **2 a N integrantes** (não limitado a casais).
- Existe um papel de **administrador (owner)** — quem cria a família é o primeiro admin.
- Uma família pode ter mais de um admin (promoção por admin existente).
- Um usuário pode participar de **múltiplas famílias** (ex.: sua família e a dos pais), mas cada família tem escopo de dados totalmente isolado.
- Papéis (RBAC): `ADMIN`, `MEMBER`.
  - `ADMIN`: convida/remove membros, gerencia permissões de compartilhamento, exclui a família, vê tudo que foi compartilhado.
  - `MEMBER`: gerencia suas próprias conexões/compartilhamentos, vê o que outros compartilharam com a família.
- Regra do último admin: **nunca é permitido remover o único ADMIN ativo de uma família** — ver [`remove-member.md`](./remove-member.md).
- `deleteFamily` exige `aal2` (MFA verificado) quando o usuário tem MFA habilitado — ver [`../../common/casl-ability-factory.md §4`](../../common/casl-ability-factory.md).

## 4. `entities/*.entity.ts`

```typescript
// apps/api/src/modules/family/entities/family.entity.ts
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { FamilyRole as PrismaFamilyRole } from '@prisma/client';
import { Node } from '@common/types/node.interface';
import { FamilyMembership } from './family-membership.entity';

export { PrismaFamilyRole as FamilyRole };
registerEnumType(PrismaFamilyRole, { name: 'FamilyRole' });

@ObjectType({ implements: () => [Node] })
export class Family implements Node {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field(() => [FamilyMembership])
  members: FamilyMembership[];

  @Field(() => PrismaFamilyRole)
  myRole: PrismaFamilyRole;
}
```

```typescript
// apps/api/src/modules/family/entities/family-membership.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { FamilyRole } from '@prisma/client';
import { Node } from '@common/types/node.interface';
import { Family } from './family.entity';
import { User } from '@auth/entities/user.entity';

@ObjectType({ implements: () => [Node] })
export class FamilyMembership implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field(() => User)
  user: User;

  @Field(() => FamilyRole)
  role: FamilyRole;

  @Field()
  joinedAt: Date;
}
```

```typescript
// apps/api/src/modules/family/entities/family-invite.entity.ts
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { Node } from '@common/types/node.interface';
import { Family } from './family.entity';
import { User } from '@auth/entities/user.entity';

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}
registerEnumType(InviteStatus, { name: 'InviteStatus' });

@ObjectType({ implements: () => [Node] })
export class FamilyInvite implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => Family)
  family: Family;

  @Field()
  email: string;

  @Field(() => User)
  invitedBy: User;

  @Field(() => InviteStatus)
  status: InviteStatus;

  @Field()
  expiresAt: Date;
}
```

```typescript
// apps/api/src/modules/family/entities/family-payload.entity.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { Family } from './family.entity';
import { FamilyInvite } from './family-invite.entity';

@ObjectType()
export class FamilyPayload {
  @Field(() => Family)
  family: Family;
}

@ObjectType()
export class FamilyInvitePayload {
  @Field(() => FamilyInvite)
  invite: FamilyInvite;
}
```

## 5. Padrão de retorno — mapeamento explícito (nunca o model Prisma diretamente)

```typescript
// modules/family/entities/family.entity.ts — exemplo do princípio (ver seção 2.4 de ../../00-overview.md)
```

```typescript
// modules/family/family.service.ts (trecho de mapeamento explícito)
private toFamilyEntity(
  family: PrismaFamily & { members: (PrismaFamilyMember & { user: PrismaUser })[] },
  currentUserId: string,
): Family {
  return {
    id: family.id,
    name: family.name,
    createdAt: family.createdAt,
    members: family.members.map((m) => this.toMembershipEntity(m)),
    myRole: family.members.find((m) => m.userId === currentUserId)!.role,
  };
}
```

## 6. `myFamilies` (resolver + service)

```typescript
// apps/api/src/modules/family/family.service.ts (trecho)
/** Lista as famílias de que o usuário autenticado participa ativamente. */
async findMyFamilies(userId: string): Promise<FamilyMembership[]> {
  const memberships = await this.prisma.familyMember.findMany({
    where: { userId, removedAt: null },
    include: { family: { include: { members: { where: { removedAt: null }, include: { user: true } } } }, user: true },
  });
  return memberships.map((m) => this.toMembershipEntity(m, m.family));
}
```

```typescript
// apps/api/src/modules/family/family.resolver.ts (trecho)
@Query(() => [FamilyMembership])
async myFamilies(@CurrentUser() user: AuthUser): Promise<FamilyMembership[]> {
  return this.familyService.findMyFamilies(user.userId);
}
```

## 7. `family.resolver.ts` completo

```typescript
// apps/api/src/modules/family/family.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CheckAbility } from '@common/decorators/check-ability.decorator';
import { PoliciesGuard } from '@common/guards/policies.guard';
import { Action } from '@casl/action.enum';
import { AuthUser } from '@common/types/auth-user.type';
import { FamilyService } from './family.service';
import { CreateFamilyInput } from './dto/create-family.input';
import { InviteFamilyMemberInput } from './dto/invite-family-member.input';
import { RemoveMemberInput } from './dto/remove-member.input';
import { PromoteMemberInput } from './dto/promote-member.input';
import { FamilyMembership } from './entities/family-membership.entity';
import { FamilyPayload, FamilyInvitePayload } from './entities/family-payload.entity';

@Resolver(() => FamilyMembership)
@UseGuards(PoliciesGuard) // JwtAuthGuard já é global (ver app.module.ts abaixo); este guard só resolve CASL
export class FamilyResolver {
  constructor(private readonly familyService: FamilyService) {}

  @Query(() => [FamilyMembership])
  async myFamilies(@CurrentUser() user: AuthUser): Promise<FamilyMembership[]> {
    return this.familyService.findMyFamilies(user.userId);
  }

  @Mutation(() => FamilyPayload)
  async createFamily(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateFamilyInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.createFamily(user.userId, input);
    return { family };
  }

  @CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
  @Mutation(() => FamilyInvitePayload)
  async inviteMember(
    @CurrentUser() user: AuthUser,
    @Args('input') input: InviteFamilyMemberInput,
  ): Promise<FamilyInvitePayload> {
    const { invite } = await this.familyService.inviteMember(user.userId, input);
    return { invite: invite as any }; // mapeamento completo omitido por brevidade — segue padrão da seção 5 acima
  }

  @CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
  @Mutation(() => FamilyPayload)
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Args('input') input: RemoveMemberInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.removeMember(user.userId, input);
    return { family };
  }

  @CheckAbility({ action: Action.Manage, subject: 'FamilyMember', resolveFamilyId: (a) => a.input.familyId })
  @Mutation(() => FamilyPayload)
  async promoteMember(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PromoteMemberInput,
  ): Promise<FamilyPayload> {
    const family = await this.familyService.promoteMember(user.userId, input);
    return { family };
  }
}
```

## 8. `app.module.ts` completo (configuração global — guards, filtro, pipe, todos os módulos)

Ambos `JwtAuthGuard`/`GraphQLExceptionFilter` são registrados **globalmente** via `APP_GUARD`/`APP_FILTER` (padrão NestJS para providers globais), não via `app.useGlobalGuards()`/`app.useGlobalFilters()` no `main.ts` — necessário porque `JwtAuthGuard` precisa do `Reflector` para checar `@Public()`; o filtro precisa do logger/Sentry, enquanto `app.useGlobalGuards()` fora do container de DI não resolveria essas dependências de forma limpa.

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { envValidationSchema } from '@config/env.validation';
import { graphqlConfig } from '@config/graphql.config';
import { PrismaModule } from '@prisma-module/prisma.module';
import { AuthModule } from '@auth/auth.module';
import { CaslModule } from '@casl/casl.module';

import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { GqlThrottlerGuard } from '@common/guards/gql-throttler.guard';
import { GraphQLExceptionFilter } from '@common/filters/graphql-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { AuditLogInterceptor } from '@common/interceptors/audit-log.interceptor';

import { FamilyModule } from '@modules/family/family.module';
import { OpenFinanceModule } from '@modules/open-finance/open-finance.module';
import { AccountsModule } from '@modules/accounts/accounts.module';
import { CardsModule } from '@modules/cards/cards.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { SharingPermissionsModule } from '@modules/sharing-permissions/sharing-permissions.module';
import { RecurringExpensesModule } from '@modules/recurring-expenses/recurring-expenses.module';
import { CategoriesModule } from '@modules/categories/categories.module';
import { AuditLogModule } from '@modules/audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    LoggerModule.forRoot({ pinoHttp: { redact: ['req.headers.authorization'] } }), // F3 de 04-SECURITY-COMPLIANCE.md
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: graphqlConfig, // autoSchemaFile, formatError, plugins de depth/complexity, introspection só fora de produção
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'auth-sensitive', ttl: 60_000, limit: 5 },
      { name: 'invite', ttl: 60_000, limit: 10 },
      { name: 'openfinance-sync', ttl: 60_000, limit: 6 },
      { name: 'mutation-write', ttl: 60_000, limit: 60 },
    ]),
    PrismaModule,
    AuthModule,
    CaslModule,
    AuditLogModule,
    FamilyModule,
    OpenFinanceModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    SharingPermissionsModule,
    RecurringExpensesModule,
    CategoriesModule,
  ],
  providers: [
    // Ordem de execução: Throttler -> JwtAuthGuard -> (PoliciesGuard local por resolver)
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
```

Ver [`../../common/jwt-auth-guard.md`](../../common/jwt-auth-guard.md) para o `JwtAuthGuard`/`SupabaseJwtStrategy` completos, [`../../common/casl-ability-factory.md`](../../common/casl-ability-factory.md) para o `PoliciesGuard`/`AbilityFactory`, [`../../common/exception-filter.md`](../../common/exception-filter.md) para o `GraphQLExceptionFilter`/`ErrorCode`, e [`../../common/vercel-serverless-handler.md`](../../common/vercel-serverless-handler.md) para o `PrismaService` e o handler serverless.

## Suposição desta spec

**Nomes de mutations de família:** o pedido original citou `inviteFamilyMember`/`promoteToAdmin`; como o SDL oficial já define `inviteMember`/`promoteMember`, este documento usa os nomes do SDL (fonte da verdade) e mantém `InviteFamilyMemberInput` apenas como nome de **arquivo/classe DTO** interno (mapeado ao `input` de mutation `InviteMemberInput` do SDL via `@InputType('InviteMemberInput')`), evitando duas nomenclaturas de API divergentes.
