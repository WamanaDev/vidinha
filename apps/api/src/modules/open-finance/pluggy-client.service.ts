import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UpstreamErrorAppException } from "@common/errors/app.exceptions";

const PLUGGY_BASE_URL = "https://api.pluggy.ai";

// SUPOSIÇÃO: TTL conservador de 1h50min para a API key do Pluggy (o provedor emite
// um JWT de curta duração, geralmente ~2h — não documentado com exatidão nas specs
// nem verificável sem credenciais reais). Renovamos antes do vencimento em vez de
// decodificar o JWT (evita depender de uma lib de decode só para isso), conforme
// permitido pelo contrato do módulo (open-finance.module.md §2).
const API_KEY_TTL_MS = 110 * 60 * 1000;

export interface PluggyItem {
  id: string;
  connector: {
    id: number;
    name: string;
    imageUrl?: string;
    primaryColor?: string;
    type: string;
  };
  status: string;
  lastUpdatedAt?: string;
}

export interface PluggyAccount {
  id: string;
  type: string;
  name: string;
  number?: string;
  balance: number;
  currencyCode: string;
}

/**
 * Cliente HTTP dedicado à API do Pluggy — isola toda chamada externa (PoLP,
 * ver open-finance.module.md §2). Nenhum outro arquivo do módulo deve chamar
 * `fetch` diretamente contra `api.pluggy.ai`.
 */
@Injectable()
export class PluggyClientService {
  private readonly logger = new Logger(PluggyClientService.name);
  private cachedApiKey: { key: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Obtém (e cacheia) a API key de curta duração do Pluggy, renovando quando necessário. */
  private async getApiKey(): Promise<string> {
    if (this.cachedApiKey && this.cachedApiKey.expiresAt > Date.now()) {
      return this.cachedApiKey.key;
    }

    const clientId = this.config.get<string>("PLUGGY_CLIENT_ID");
    const clientSecret = this.config.get<string>("PLUGGY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new UpstreamErrorAppException(
        "Integração com Open Finance não está configurada.",
      );
    }

    const response = await this.request<{ apiKey: string }>("/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    this.cachedApiKey = {
      key: response.apiKey,
      expiresAt: Date.now() + API_KEY_TTL_MS,
    };
    return this.cachedApiKey.key;
  }

  /** Cria um connect token de curta duração para inicializar o widget Pluggy Connect no client. */
  async createConnectToken(
    clientUserId?: string,
  ): Promise<{ connectToken: string; expiresAt: Date }> {
    const apiKey = await this.getApiKey();
    const response = await this.request<{ accessToken: string }>(
      "/connect_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(clientUserId ? { clientUserId } : {}),
      },
    );

    // SUPOSIÇÃO: a documentação pública do Pluggy não fixa um TTL exato para o
    // connect token no corpo da resposta — usamos 30min, TTL conservador e
    // usual para tokens de inicialização de widget (o usuário completa o fluxo
    // de conexão bancária dentro desse tempo).
    return {
      connectToken: response.accessToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async getItem(itemId: string): Promise<PluggyItem> {
    const apiKey = await this.getApiKey();
    return this.request<PluggyItem>(`/items/${itemId}`, {
      method: "GET",
      headers: { "X-API-KEY": apiKey },
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    const apiKey = await this.getApiKey();
    await this.request<unknown>(`/items/${itemId}`, {
      method: "DELETE",
      headers: { "X-API-KEY": apiKey },
    });
  }

  async getAccounts(itemId: string): Promise<PluggyAccount[]> {
    const apiKey = await this.getApiKey();
    const response = await this.request<{ results: PluggyAccount[] }>(
      `/accounts?itemId=${encodeURIComponent(itemId)}`,
      { method: "GET", headers: { "X-API-KEY": apiKey } },
    );
    return response.results;
  }

  /** Força uma nova sincronização do item no Pluggy (usado por syncOpenFinanceConnection). */
  async triggerItemUpdate(itemId: string): Promise<PluggyItem> {
    const apiKey = await this.getApiKey();
    return this.request<PluggyItem>(`/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
  }

  /**
   * Wrapper de baixo nível: nunca deixa o erro cru do fetch/Pluggy vazar para
   * fora deste serviço — sempre convertido para `UpstreamErrorAppException`.
   */
  private async request<T>(path: string, init: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${PLUGGY_BASE_URL}${path}`, init);
      if (!response.ok) {
        this.logger.error(`Pluggy API respondeu ${response.status} em ${path}`);
        throw new UpstreamErrorAppException();
      }
      if (response.status === 204) return undefined as unknown as T;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UpstreamErrorAppException) throw error;
      this.logger.error(
        `Falha ao comunicar com o Pluggy (${path})`,
        error as Error,
      );
      throw new UpstreamErrorAppException();
    }
  }
}
