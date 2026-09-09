import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { NotFoundAppException } from "@common/errors/app.exceptions";
import { User } from "@prisma/client";
import { CompleteProfileInput } from "./dto/complete-profile.input";
import { User as UserEntity } from "./entities/user.entity";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Just-in-time provisioning: cria/atualiza o registro local `User` na
   * primeira requisição autenticada (ver specs/backend/common/jwt-auth-guard.md §2).
   */
  async upsertFromAuthToken(userId: string, email: string): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email },
    });
  }

  async me(userId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt)
      throw new NotFoundAppException("Usuário não encontrado.");
    return this.toEntity(user);
  }

  async completeProfile(
    userId: string,
    input: CompleteProfileInput,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: input.displayName, avatarUrl: input.avatarUrl },
    });
    return this.toEntity(user);
  }

  /**
   * SUPOSIÇÃO: exclusão efetiva (job assíncrono em até 30 dias, conforme LGPD)
   * fica fora do escopo deste bootstrap — aqui apenas marcamos `deletedAt`
   * (soft-delete), que já basta para remover o usuário das consultas ativas.
   */
  async requestAccountDeletion(userId: string): Promise<boolean> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  private toEntity(user: User): UserEntity {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      // SUPOSIÇÃO: `mfaEnabled` não existe no schema.prisma local — o estado de
      // MFA é gerenciado inteiramente pelo Supabase Auth (ver jwt-auth-guard.md §7).
      // Exibido como `false` até que o backend passe a consultar a Admin API do
      // Supabase para refletir o estado real.
      mfaEnabled: false,
      createdAt: user.createdAt,
    };
  }
}
