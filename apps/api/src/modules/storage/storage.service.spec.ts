import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SupabaseStorageService } from "./storage.service";
import { UpstreamErrorAppException } from "@common/errors/app.exceptions";

describe("SupabaseStorageService", () => {
  let service: SupabaseStorageService;
  let configGet: jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn((key: string) => {
      if (key === "SUPABASE_URL") return "https://project.supabase.co";
      if (key === "SUPABASE_SERVICE_ROLE_KEY") return "service-role-key";
      return undefined;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupabaseStorageService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = moduleRef.get(SupabaseStorageService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createUploadUrl", () => {
    it("chama POST /object/upload/sign/avatars/:path com a service role key e monta a URL completa", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          url: "/object/upload/sign/avatars/user-1/avatar.jpg?token=abc",
          token: "abc",
        }),
      });

      const url = await service.createUploadUrl("user-1/avatar.jpg");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(
        "https://project.supabase.co/storage/v1/object/upload/sign/avatars/user-1/avatar.jpg",
      );
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: "Bearer service-role-key",
        apikey: "service-role-key",
      });
      expect(url).toBe(
        "https://project.supabase.co/storage/v1/object/upload/sign/avatars/user-1/avatar.jpg?token=abc",
      );
    });
  });

  describe("createReadUrl", () => {
    it("chama POST /object/sign/avatars/:path com expiresIn e monta a URL completa", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: "/object/sign/avatars/user-1/avatar.jpg?token=xyz",
        }),
      });

      const url = await service.createReadUrl("user-1/avatar.jpg");

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        expiresIn: 3600,
      });
      expect(url).toBe(
        "https://project.supabase.co/storage/v1/object/sign/avatars/user-1/avatar.jpg?token=xyz",
      );
    });
  });

  describe("deleteObject", () => {
    it("chama DELETE /object/avatars/:path", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await service.deleteObject("user-1/avatar.jpg");

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://project.supabase.co/storage/v1/object/avatars/user-1/avatar.jpg",
      );
      expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    });
  });

  describe("resolveAvatarUrl", () => {
    it("retorna undefined sem chamar o Storage quando path é nulo/undefined", async () => {
      expect(await service.resolveAvatarUrl(null)).toBeUndefined();
      expect(await service.resolveAvatarUrl(undefined)).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("computa a signed read URL quando path está presente", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          signedURL: "/object/sign/avatars/user-1/avatar.jpg?token=xyz",
        }),
      });

      const url = await service.resolveAvatarUrl("user-1/avatar.jpg");

      expect(url).toBe(
        "https://project.supabase.co/storage/v1/object/sign/avatars/user-1/avatar.jpg?token=xyz",
      );
    });
  });

  it("converte falha de rede em UpstreamErrorAppException sem vazar o erro cru", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(service.createReadUrl("user-1/avatar.jpg")).rejects.toThrow(
      UpstreamErrorAppException,
    );
  });

  it("converte resposta HTTP não-ok em UpstreamErrorAppException", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(service.createReadUrl("user-1/avatar.jpg")).rejects.toThrow(
      UpstreamErrorAppException,
    );
  });

  it("lança UpstreamErrorAppException quando SUPABASE_URL/SERVICE_ROLE_KEY não estão configuradas", async () => {
    configGet.mockImplementation(() => undefined);

    await expect(service.createReadUrl("user-1/avatar.jpg")).rejects.toThrow(
      UpstreamErrorAppException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
