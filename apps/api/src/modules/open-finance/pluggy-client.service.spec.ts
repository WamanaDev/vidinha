import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PluggyClientService } from "./pluggy-client.service";
import {
  BadUserInputAppException,
  ConflictAppException,
  UpstreamErrorAppException,
} from "@common/errors/app.exceptions";

describe("PluggyClientService", () => {
  let service: PluggyClientService;
  let configGet: jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn((key: string) => {
      if (key === "PLUGGY_CLIENT_ID") return "client-id";
      if (key === "PLUGGY_CLIENT_SECRET") return "client-secret";
      return undefined;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        PluggyClientService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = moduleRef.get(PluggyClientService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function mockAuth(apiKey = "api-key-1") {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ apiKey }),
    });
  }

  it("obtém a API key chamando POST /auth com clientId/clientSecret e a reutiliza em chamadas subsequentes (cache)", async () => {
    mockAuth("api-key-1");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      });

    await service.listConnectors();
    await service.listConnectors();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.pluggy.ai/auth");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const authCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "https://api.pluggy.ai/auth",
    );
    expect(authCalls).toHaveLength(1);

    const connectorCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).startsWith("https://api.pluggy.ai/connectors"),
    );
    expect(connectorCalls).toHaveLength(2);
    expect(connectorCalls[0][1].headers["X-API-KEY"]).toBe("api-key-1");
  });

  it("renova a API key quando o TTL cacheado expira", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));

    mockAuth("api-key-1");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    await service.listConnectors();

    // Avança além do TTL conservador de 1h50min usado internamente.
    jest.setSystemTime(new Date("2026-01-01T02:00:00Z"));

    mockAuth("api-key-2");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    await service.listConnectors();

    const authCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "https://api.pluggy.ai/auth",
    );
    expect(authCalls).toHaveLength(2);
  });

  it("converte falhas de comunicação com o Pluggy em UpstreamErrorAppException, nunca vazando o erro cru", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "detalhe interno do Pluggy" }),
    });

    await expect(service.listConnectors()).rejects.toBeInstanceOf(
      UpstreamErrorAppException,
    );
  });

  it("lança UpstreamErrorAppException quando PLUGGY_CLIENT_ID/SECRET não estão configurados", async () => {
    configGet.mockReturnValue(undefined);

    await expect(service.listConnectors()).rejects.toBeInstanceOf(
      UpstreamErrorAppException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("listConnectors", () => {
    it('envia countries=["BR"] por padrão e repassa sandbox quando informado', async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ id: 1, name: "Banco Teste" }] }),
      });

      const result = await service.listConnectors({ sandbox: true });

      expect(result).toEqual([{ id: 1, name: "Banco Teste" }]);
      const [url] = fetchMock.mock.calls[1];
      expect(url).toContain("/connectors?");
      expect(decodeURIComponent(url)).toContain('countries=["BR"]');
      expect(decodeURIComponent(url)).toContain("sandbox=true");
    });
  });

  describe("createItem", () => {
    it("cria o item repassando connectorId e parameters, sem logar credenciais", async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "item-1",
          status: "UPDATING",
          executionStatus: "CREATED",
          connector: { id: 123, name: "Banco Teste", type: "PERSONAL_BANK" },
        }),
      });

      const loggerErrorSpy = jest.spyOn(
        (service as unknown as { logger: { error: jest.Mock } }).logger,
        "error",
      );

      const item = await service.createItem(123, {
        user: "joao",
        password: "super-secreto",
      });

      expect(item.id).toBe("item-1");
      const [, init] = fetchMock.mock.calls[1];
      expect(JSON.parse(init.body)).toEqual({
        connectorId: 123,
        parameters: { user: "joao", password: "super-secreto" },
      });

      // Nenhuma chamada de log deve conter o valor da credencial.
      for (const call of loggerErrorSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain("super-secreto");
      }
    });

    it("mapeia CONNECTOR_VALIDATION_ERROR (400) para BadUserInputAppException", async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          codeDescription: "CONNECTOR_VALIDATION_ERROR",
          message: "parâmetro inválido",
          details: [{ code: "invalid", parameter: "password" }],
        }),
      });

      await expect(
        service.createItem(123, { user: "joao", password: "errado" }),
      ).rejects.toBeInstanceOf(BadUserInputAppException);
    });

    it("mapeia ITEM_USER_ALREADY_EXISTS (400) para ConflictAppException", async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ codeDescription: "ITEM_USER_ALREADY_EXISTS" }),
      });

      await expect(
        service.createItem(123, { user: "joao", password: "x" }),
      ).rejects.toBeInstanceOf(ConflictAppException);
    });

    it("cai em UpstreamErrorAppException para erros não mapeados", async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ codeDescription: "SOME_OTHER_ERROR" }),
      });

      await expect(
        service.createItem(123, { user: "joao", password: "x" }),
      ).rejects.toBeInstanceOf(UpstreamErrorAppException);
    });
  });

  describe("sendItemMfa", () => {
    it("envia o valor de MFA para /items/{id}/mfa", async () => {
      mockAuth();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "item-1",
          status: "UPDATING",
          executionStatus: "CREATED",
          connector: { id: 123, name: "Banco Teste", type: "PERSONAL_BANK" },
        }),
      });

      const item = await service.sendItemMfa("item-1", { token: "123456" });

      expect(item.id).toBe("item-1");
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("https://api.pluggy.ai/items/item-1/mfa");
      expect(JSON.parse(init.body)).toEqual({ token: "123456" });
    });
  });
});
