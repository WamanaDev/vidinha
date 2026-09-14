import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { SupabaseStorageService } from "@modules/storage/storage.service";
import {
  BadUserInputAppException,
  NotFoundAppException,
} from "@common/errors/app.exceptions";
import { User } from "@prisma/client";
import { CompleteProfileInput } from "./dto/complete-profile.input";
import { User as UserEntity } from "./entities/user.entity";
import { AvatarUploadUrlPayload } from "./entities/avatar-upload-url-payload.entity";

/**
 * Allowlist de mimeType para upload de avatar — mesma allowlist configurada
 * no bucket `avatars` do Supabase Storage (`allowed_mime_types`, ver
 * specs/security/file-uploads.md). A extensão de cada entrada é usada para
 * montar o path `<userId>/avatar.<extensão>`.
 */
const ALLOWED_AVATAR_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

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

  /**
   * Gera uma URL de upload assinada de curta duração para o avatar do
   * usuário autenticado. O path é sempre `<userId>/avatar.<extensão>`
   * (derivado do `mimeType`), garantindo que o client nunca escolha um path
   * arbitrário — `completeProfile` reforça essa mesma regra ao persistir.
   */
  async createAvatarUploadUrl(
    userId: string,
    mimeType: string,
  ): Promise<AvatarUploadUrlPayload> {
    const extension = ALLOWED_AVATAR_MIME_TYPES.get(mimeType);
    if (!extension) {
      throw new BadUserInputAppException(
        "Tipo de arquivo não suportado. Utilize JPEG, PNG ou WEBP.",
      );
    }

    const path = `${userId}/avatar.${extension}`;
    const uploadUrl = await this.storage.createUploadUrl(path);
    return { uploadUrl, path };
  }

  async completeProfile(
    userId: string,
    input: CompleteProfileInput,
  ): Promise<UserEntity> {
    // Nunca confiar apenas na regex do DTO: o path precisa pertencer ao
    // próprio usuário autenticado (prefixo `<userId>/`), nunca a path de
    // outro usuário.
    if (input.avatarPath && !input.avatarPath.startsWith(`${userId}/`)) {
      throw new BadUserInputAppException(
        "O caminho do avatar informado não pertence ao usuário autenticado.",
      );
    }

    const previousUser = input.avatarPath
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: input.displayName, avatarUrl: input.avatarPath },
    });

    if (
      input.avatarPath &&
      previousUser?.avatarUrl &&
      previousUser.avatarUrl !== input.avatarPath
    ) {
      // Best-effort: a exclusão do avatar antigo nunca deve derrubar a
      // mutation (o usuário já trocou de foto com sucesso).
      this.storage.deleteObject(previousUser.avatarUrl).catch((error) => {
        this.logger.warn(
          `Falha ao remover avatar antigo (best-effort, userId=${userId}): ${(error as Error).message}`,
        );
      });
    }

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

  private async toEntity(user: User): Promise<UserEntity> {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? undefined,
      avatarUrl: await this.storage.resolveAvatarUrl(user.avatarUrl),
      // SUPOSIÇÃO: `mfaEnabled` não existe no schema.prisma local — o estado de
      // MFA é gerenciado inteiramente pelo Supabase Auth (ver jwt-auth-guard.md §7).
      // Exibido como `false` até que o backend passe a consultar a Admin API do
      // Supabase para refletir o estado real.
      mfaEnabled: false,
      createdAt: user.createdAt,
    };
  }
}
