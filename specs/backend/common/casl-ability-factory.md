# Common — CASL AbilityFactory (RBAC + ABAC)

**Extraído de:** `specs/02-API-AUTH.md §2` (Autorização — RBAC + ABAC). Ver [`../00-overview.md`](../00-overview.md) para o índice completo.

---

## 1. Camadas de autorização

1. **Autenticação** (guard JWT, ver [`jwt-auth-guard.md`](./jwt-auth-guard.md)) — resolve *quem* está fazendo a requisição.
2. **RBAC** — resolve o papel do usuário **dentro de uma família específica** (`ADMIN` ou `MEMBER`), consultado na tabela `FamilyMember`.
3. **ABAC (CASL)** — resolve, por instância de recurso, se a ação é permitida com base em atributos (dono do recurso, flags de compartilhamento, categoria oculta, etc.).

RBAC e ABAC não são alternativas — RBAC define o **papel** (input do CASL), e as `abilities` do CASL combinam papel + atributos do recurso na decisão final. Toda mutation/query sensível é decorada com um `@CheckAbility()` que roda a checagem no início do resolver (fail secure: nega por padrão se a ability não cobrir o caso).

## 2. Definição de Abilities (CASL) — `AbilityFactory`

```typescript
// apps/api/src/casl/ability.factory.ts
export enum Action {
  Manage = 'manage', // CASL wildcard: qualquer ação
  Read = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

type Subjects =
  | 'Family'
  | 'FamilyMember'
  | 'SharingPermission'
  | 'Transaction'
  | 'Account'
  | 'Card'
  | 'OpenFinanceConnection'
  | 'all';

export type AppAbility = Ability<[Action, Subjects | InferSubjects<any>]>;

@Injectable()
export class AbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, familyId: string): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(Ability as any);

    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });
    if (!membership) return build(); // sem vínculo com a família => nenhuma permissão

    if (membership.role === 'ADMIN') {
      can(Action.Manage, 'FamilyMember');       // convidar, remover, promover
      can(Action.Delete, 'Family');             // excluir família
      can(Action.Read, 'SharingPermission');    // ver todas as permissões da família
    }

    if (membership.role === 'MEMBER') {
      can(Action.Read, 'Family');
      cannot(Action.Delete, 'Family');
      cannot(Action.Manage, 'FamilyMember');
      can(Action.Update, 'FamilyMember', { userId }); // só o próprio vínculo (ex.: sair da família)
    }

    // Regra 1 — MEMBER só edita a própria SharingPermission
    can(Action.Update, 'SharingPermission', { ownerId: userId });
    cannot(Action.Update, 'SharingPermission', { ownerId: { $ne: userId } });

    // Regra 2 — ADMIN pode remover qualquer membro, exceto a si mesmo se for o único admin
    // (checagem de "único admin" fica no resolver, pois depende de contagem agregada,
    // não é expressável apenas como atributo estático da instância — ver
    // ../modules/family/remove-member.md)

    // Regra 3 — Transaction: dono sempre lê; não-dono lê SE compartilhada com a família
    // E a categoria não estiver oculta E a transação não estiver hiddenFromFamily
    can(Action.Read, 'Transaction', { ownerId: userId });
    can(Action.Read, 'Transaction', {
      familyId,
      sharedWithFamily: true,
      hiddenFromFamily: false,
      'category.hiddenFromFamily': false,
    });

    // Só o dono edita/exclui uma transação, independentemente de compartilhamento
    can(Action.Update, 'Transaction', { ownerId: userId });
    can(Action.Delete, 'Transaction', { ownerId: userId });

    return build({
      detectSubjectType: (item) => item.constructor.name as Subjects,
    });
  }
}
```

## 3. Uso no resolver

```typescript
@UseGuards(GqlAuthGuard, FamilyScopeGuard)
@Resolver(() => Transaction)
export class TransactionsResolver {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Query(() => [Transaction])
  async transactions(
    @CurrentUser() user: AuthUser,
    @Args('familyId') familyId: string,
    @Args('filter', { nullable: true }) filter?: TransactionFilterInput,
  ) {
    const ability = await this.abilityFactory.createForUser(user.userId, familyId);
    // busca candidatos e filtra em memória/via query condicional (accessibleBy do @casl/prisma)
    return this.transactionsService.findVisible(ability, familyId, filter);
  }

  @Mutation(() => SharingPermission)
  async updateSharingPermission(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateSharingPermissionInput,
  ) {
    const permission = await this.sharingService.findOrThrow(input.id);
    const ability = await this.abilityFactory.createForUser(user.userId, permission.familyId);
    ForbiddenError.from(ability).throwUnlessCan(Action.Update, permission);
    return this.sharingService.update(input);
  }
}
```

Recomenda-se usar `@casl/prisma` (`accessibleBy(ability)`) para traduzir a ability diretamente em cláusula `where` do Prisma, evitando buscar registros que o usuário não pode ver e depois filtrar em memória (defesa em profundidade + performance).

## 4. Step-up de segurança (QoAS leve)

Ações de alto risco (excluir família, revogar todas as conexões Open Finance de uma vez, exportar todos os dados) exigem `aal2` (MFA verificado) quando o usuário tem MFA habilitado:

```typescript
can(Action.Delete, 'Family', { requiresAal2: true }); // checado no guard: user.aal === 'aal2'
```

Se o usuário não tem MFA habilitado, a checagem de `aal2` é ignorada (não é possível exigir um fator que não existe) — comportamento documentado, não um contorno de segurança.

## 5. `PoliciesGuard` e `@CheckAbility()`

Guard genérico que executa a checagem de ability declarada por decorator, reaproveitado por todos os módulos de domínio (ver exemplo de uso completo em [`../modules/family/family.module.md`](../modules/family/family.module.md)):

```typescript
// apps/api/src/common/guards/policies.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AbilityFactory } from '@casl/ability.factory';
import { CHECK_ABILITY_KEY, RequiredAbility } from '@common/decorators/check-ability.decorator';
import { ForbiddenAppException } from '@common/errors/app.exceptions';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<RequiredAbility | undefined>(
      CHECK_ABILITY_KEY,
      context.getHandler(),
    );
    if (!required) return true; // resolver sem @CheckAbility() — controle de acesso feito manualmente no service

    const gqlCtx = GqlExecutionContext.create(context);
    const { user } = gqlCtx.getContext().req;
    const args = gqlCtx.getArgs();
    const familyId = required.resolveFamilyId(args);

    const ability = await this.abilityFactory.createForUser(user.userId, familyId);
    if (!ability.can(required.action, required.subject)) {
      // fail secure: nega por padrão se a ability não cobrir o caso
      throw new ForbiddenAppException('Você não tem permissão para executar esta ação.');
    }
    return true;
  }
}
```

```typescript
// apps/api/src/common/decorators/check-ability.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Action } from '@casl/action.enum';

export const CHECK_ABILITY_KEY = 'check_ability';

export interface RequiredAbility {
  action: Action;
  subject: string;
  /** Extrai o familyId relevante dos argumentos GraphQL da operação, para a AbilityFactory. */
  resolveFamilyId: (args: Record<string, any>) => string;
}

export const CheckAbility = (ability: RequiredAbility) => SetMetadata(CHECK_ABILITY_KEY, ability);
```

Uso no resolver (mutation `removeMember` exige `Action.Manage` sobre `FamilyMember`, conforme `AbilityFactory` — só `ADMIN` tem essa permissão):

```typescript
@CheckAbility({
  action: Action.Manage,
  subject: 'FamilyMember',
  resolveFamilyId: (args) => args.input.familyId,
})
@Mutation(() => FamilyPayload)
async removeMember(@CurrentUser() user: AuthUser, @Args('input') input: RemoveMemberInput) {
  const family = await this.familyService.removeMember(user.userId, input);
  return { family };
}
```
