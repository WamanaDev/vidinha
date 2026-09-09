import { Injectable } from "@nestjs/common";
import {
  Ability,
  AbilityBuilder,
  InferSubjects,
  detectSubjectType,
} from "@casl/ability";
import { FamilyRole } from "@prisma/client";
import { PrismaService } from "@prisma-module/prisma.service";
import { Action } from "./action.enum";

export type Subjects =
  | "Family"
  | "FamilyMember"
  | "SharingPermission"
  | "Transaction"
  | "Account"
  | "Card"
  | "OpenFinanceConnection"
  | "all";

export type AppAbility = Ability<[Action, Subjects | InferSubjects<any>]>;

/**
 * RBAC (papel na família) + ABAC (atributos do recurso).
 * Ver specs/backend/common/casl-ability-factory.md.
 */
@Injectable()
export class AbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, familyId: string): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as any,
    );

    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership || membership.removedAt) {
      return build(); // sem vínculo ativo com a família => nenhuma permissão
    }

    if (membership.role === FamilyRole.ADMIN) {
      can(Action.Manage, "FamilyMember"); // convidar, remover, promover
      can(Action.Delete, "Family"); // excluir família
      can(Action.Read, "SharingPermission"); // ver todas as permissões da família
    }

    if (membership.role === FamilyRole.MEMBER) {
      can(Action.Read, "Family");
      cannot(Action.Delete, "Family");
      cannot(Action.Manage, "FamilyMember");
      can(Action.Update, "FamilyMember", { userId }); // só o próprio vínculo (ex.: sair da família)
    }

    // Regra 1 — MEMBER só edita a própria SharingPermission
    can(Action.Update, "SharingPermission", { ownerId: userId });
    cannot(Action.Update, "SharingPermission", { ownerId: { $ne: userId } });

    // SUPOSIÇÃO: o rascunho de CASL na spec (casl-ability-factory.md §2) só
    // cobria `Action.Read` explícito para ADMIN ("ver todas as permissões da
    // família") — adicionamos aqui a leitura do próprio dono, já que um MEMBER
    // precisa poder ver (e então editar) as próprias `SharingPermission` pelo
    // app, o que a spec não pretendia impedir.
    can(Action.Read, "SharingPermission", { ownerId: userId });

    // Regra 2 — ADMIN pode remover qualquer membro, exceto a si mesmo se for o único
    // admin (checagem de contagem agregada fica no service, não é expressável como
    // atributo estático da instância — ver modules/family/family.service.ts).

    // Regra 3 — Transaction: dono sempre lê; não-dono lê se compartilhada com a
    // família e não estiver oculta.
    can(Action.Read, "Transaction", { ownerId: userId });
    can(Action.Read, "Transaction", {
      familyId,
      sharedWithFamily: true,
      hiddenFromFamily: false,
    } as any);

    can(Action.Update, "Transaction", { ownerId: userId });
    can(Action.Delete, "Transaction", { ownerId: userId });

    // Regra 4 — OpenFinanceConnection: dono sempre gerencia (ler, sincronizar,
    // revogar) a própria conexão.
    // SUPOSIÇÃO: o módulo `sharing-permissions` ainda não existe — quando for
    // implementado, adicionar aqui `can(Action.Read, "OpenFinanceConnection", { ... })`
    // para membros da família com quem uma conta (`Account`) vinculada à conexão
    // tenha sido compartilhada via `SharingPermission` (recurso `ACCOUNT`).
    // Por ora, apenas o dono tem qualquer permissão sobre `OpenFinanceConnection`.
    can(Action.Manage, "OpenFinanceConnection", { userId });

    // SUPOSIÇÃO: usamos o `detectSubjectType` padrão exportado por
    // `@casl/ability` (em vez de `item.constructor.name` puro) porque ele
    // respeita a marcação feita por `subject('SharingPermission', instance)`
    // (usada em sharing-permissions.service.ts para checagens por instância
    // via `ForbiddenError.from(ability).throwUnlessCan(...)`) antes de cair
    // no fallback de `constructor.name` — sem isso, objetos simples vindos do
    // Prisma (constructor `Object`) nunca seriam corretamente identificados.
    return build({
      detectSubjectType: (item: any) => detectSubjectType(item) as Subjects,
    });
  }
}
