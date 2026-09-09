import { Injectable } from "@nestjs/common";
import { Ability, AbilityBuilder, InferSubjects } from "@casl/ability";
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

    return build({
      detectSubjectType: (item: any) => item.constructor.name as Subjects,
    });
  }
}
