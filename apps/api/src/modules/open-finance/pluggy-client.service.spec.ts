import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PluggyClientService } from "./pluggy-client.service";
import { UpstreamErrorAppException } from "@common/errors/app.exceptions";

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

  it("obtém a API key chamando POST /auth com clientId/clientSecret e a reutiliza em chamadas subsequentes (cache)", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: "api-key-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "connect-token-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "connect-token-2" }),
      });

    await service.createConnectToken("user-1");
    await service.createConnectToken("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.pluggy.ai/auth");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    // A segunda chamada a createConnectToken NÃO deve repetir a chamada a /auth
    // (apenas 1 chamada a /auth no total, mesmo com 2 createConnectToken).
    const authCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "https://api.pluggy.ai/auth",
    );
    expect(authCalls).toHaveLength(1);

    const connectCalls = fetchMock.mock.calls.filter(
      (call) => call[0] === "https://api.pluggy.ai/connect_token",
    );
    expect(connectCalls).toHaveLength(2);
    expect(connectCalls[0][1].headers["X-API-KEY"]).toBe("api-key-1");
  });

  it("renova a API key quando o TTL cacheado expira", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: "api-key-1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "connect-token-1" }),
      });

    await service.createConnectToken();

    // Avança além do TTL conservador de 1h50min usado internamente.
    jest.setSystemTime(new Date("2026-01-01T02:00:00Z"));

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ apiKey: "api-key-2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: "connect-token-2" }),
      });

    await service.createConnectToken();

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

    await expect(service.createConnectToken()).rejects.toBeInstanceOf(
      UpstreamErrorAppException,
    );
  });

  it("lança UpstreamErrorAppException quando PLUGGY_CLIENT_ID/SECRET não estão configurados", async () => {
    configGet.mockReturnValue(undefined);

    await expect(service.createConnectToken()).rejects.toBeInstanceOf(
      UpstreamErrorAppException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
