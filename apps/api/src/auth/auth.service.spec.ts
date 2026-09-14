import { Test } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "@prisma-module/prisma.service";
import { SupabaseStorageService } from "@modules/storage/storage.service";
import { BadUserInputAppException } from "@common/errors/app.exceptions";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; upsert: jest.Mock };
  };
  let storage: {
    resolveAvatarUrl: jest.Mock;
    createUploadUrl: jest.Mock;
    deleteObject: jest.Mock;
  };

  const userId = "11111111-1111-1111-1111-111111111111";
  const otherUserId = "22222222-2222-2222-2222-222222222222";

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };
    storage = {
      resolveAvatarUrl: jest.fn().mockResolvedValue(undefined),
      createUploadUrl: jest.fn(),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseStorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe("createAvatarUploadUrl", () => {
    it("gera a upload URL para um mimeType permitido, com path prefixado pelo userId", async () => {
      storage.createUploadUrl.mockResolvedValue(
        "https://project.supabase.co/storage/v1/object/upload/sign/avatars/x?token=abc",
      );

      const result = await service.createAvatarUploadUrl(userId, "image/png");

      expect(storage.createUploadUrl).toHaveBeenCalledWith(
        `${userId}/avatar.png`,
      );
      expect(result).toEqual({
        uploadUrl:
          "https://project.supabase.co/storage/v1/object/upload/sign/avatars/x?token=abc",
        path: `${userId}/avatar.png`,
      });
    });

    it.each(["image/jpeg", "image/webp"])(
      "aceita %s como mimeType válido",
      async (mimeType) => {
        storage.createUploadUrl.mockResolvedValue("url");
        await expect(
          service.createAvatarUploadUrl(userId, mimeType),
        ).resolves.toBeDefined();
      },
    );

    it("rejeita mimeType fora da allowlist", async () => {
      await expect(
        service.createAvatarUploadUrl(userId, "image/gif"),
      ).rejects.toThrow(BadUserInputAppException);
      expect(storage.createUploadUrl).not.toHaveBeenCalled();
    });

    it("rejeita mimeType vazio/arbitrário (ex.: application/pdf)", async () => {
      await expect(
        service.createAvatarUploadUrl(userId, "application/pdf"),
      ).rejects.toThrow(BadUserInputAppException);
    });
  });

  describe("completeProfile", () => {
    it("aceita um avatarPath prefixado pelo próprio userId autenticado", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        avatarUrl: null,
      });
      prisma.user.update.mockResolvedValue({
        id: userId,
        email: "user@test.com",
        displayName: "Fulano",
        avatarUrl: `${userId}/avatar.jpg`,
        createdAt: new Date(),
      });

      const result = await service.completeProfile(userId, {
        displayName: "Fulano",
        avatarPath: `${userId}/avatar.jpg`,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { displayName: "Fulano", avatarUrl: `${userId}/avatar.jpg` },
      });
      expect(result.displayName).toBe("Fulano");
    });

    it("rejeita um avatarPath que pertence a outro usuário", async () => {
      await expect(
        service.completeProfile(userId, {
          displayName: "Fulano",
          avatarPath: `${otherUserId}/avatar.jpg`,
        }),
      ).rejects.toThrow(BadUserInputAppException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("remove (best-effort) o avatar antigo do Storage ao trocar de path", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        avatarUrl: `${userId}/avatar.png`,
      });
      prisma.user.update.mockResolvedValue({
        id: userId,
        email: "user@test.com",
        displayName: "Fulano",
        avatarUrl: `${userId}/avatar.jpg`,
        createdAt: new Date(),
      });

      await service.completeProfile(userId, {
        displayName: "Fulano",
        avatarPath: `${userId}/avatar.jpg`,
      });

      // best-effort: chamado, mas de forma assíncrona/fire-and-forget.
      await Promise.resolve();
      expect(storage.deleteObject).toHaveBeenCalledWith(`${userId}/avatar.png`);
    });

    it("não falha a mutation quando a exclusão do avatar antigo falha", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        avatarUrl: `${userId}/avatar.png`,
      });
      prisma.user.update.mockResolvedValue({
        id: userId,
        email: "user@test.com",
        displayName: "Fulano",
        avatarUrl: `${userId}/avatar.jpg`,
        createdAt: new Date(),
      });
      storage.deleteObject.mockRejectedValue(new Error("boom"));

      await expect(
        service.completeProfile(userId, {
          displayName: "Fulano",
          avatarPath: `${userId}/avatar.jpg`,
        }),
      ).resolves.toBeDefined();
    });

    it("não altera avatarUrl quando avatarPath não é informado", async () => {
      prisma.user.update.mockResolvedValue({
        id: userId,
        email: "user@test.com",
        displayName: "Fulano",
        avatarUrl: null,
        createdAt: new Date(),
      });

      await service.completeProfile(userId, { displayName: "Fulano" });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { displayName: "Fulano", avatarUrl: undefined },
      });
    });
  });
});
