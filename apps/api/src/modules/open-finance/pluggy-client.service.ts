import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadUserInputAppException,
  ConflictAppException,
  UpstreamErrorAppException,
} from "@common/errors/app.exceptions";

const PLUGGY_BASE_URL = "https://api.pluggy.ai";

// SUPOSIÇÃO: TTL conservador de 1h50min para a API key do Pluggy (o provedor emite
// um JWT de curta duração, geralmente ~2h — não documentado com exatidão nas specs
// nem verificável sem credenciais reais). Renovamos antes do vencimento em vez de
// decodificar o JWT (evita depender de uma lib de decode só para isso), conforme
// permitido pelo contrato do módulo (open-finance.module.md §2).
const API_KEY_TTL_MS = 110 * 60 * 1000;

export interface PluggyItemError {
  code: string;
  message: string;
  providerMessage?: string;
  attributes?: Record<string, unknown>;
}

export interface PluggyItemUserAction {
  type: string;
  instructions: string;
  attributes?: Record<string, unknown>;
  expiresAt?: string;
}

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
  executionStatus?: string;
  lastUpdatedAt?: string;
  /** Presente quando o item entrou em estado de erro (LOGIN_ERROR, etc). Nunca contém credenciais. */
  error?: PluggyItemError;
  /** Presente quando o Pluggy está aguardando um valor de MFA — descreve QUAL credencial pedir agora. */
  parameter?: PluggyConnectorCredential;
  /** Presente em fluxos de device authorization (ex.: QR code / autorização no app do banco). */
  userAction?: PluggyItemUserAction;
}

export interface PluggyAccount {
  id: string;
  type: string;
  name: string;
  number?: string;
  balance: number;
  currencyCode: string;
}

export interface PluggyConnectorCredentialOption {
  value: string;
  label: string;
}

export interface PluggyConnectorCredential {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  validation?: string;
  validationMessage?: string;
  optional?: boolean;
  instructions?: string;
  options?: PluggyConnectorCredentialOption[];
}

export interface PluggyConnectorHealth {
  status: string;
}

export interface PluggyConnector {
  id: number;
  name: string;
  imageUrl?: string;
  primaryColor?: string;
  type: string;
  country: string;
  credentials: PluggyConnectorCredential[];
  hasMFA: boolean;
  oauth: boolean;
  oauthUrl?: string;
  health?: PluggyConnectorHealth;
  isOpenFinance: boolean;
  isSandbox: boolean;
}

export interface CreateItemOptions {
  webhookUrl?: string;
  clientUserId?: string;
  oauthRedirectUri?: string;
  products?: string[];
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

  /**
   * Lista os conectores (instituições) disponíveis para conexão direta via API
   * (substitui o widget Pluggy Connect — ver open-finance.module.md).
   */
  async listConnectors(
    filters: { countries?: string[]; sandbox?: boolean } = {},
  ): Promise<PluggyConnector[]> {
    const apiKey = await this.getApiKey();
    const params = new URLSearchParams();
    params.set("countries", JSON.stringify(filters.countries ?? ["BR"]));
    if (filters.sandbox !== undefined) {
      params.set("sandbox", String(filters.sandbox));
    }

    const response = await this.request<{ results: PluggyConnector[] }>(
      `/connectors?${params.toString()}`,
      { method: "GET", headers: { "X-API-KEY": apiKey } },
    );
    return response.results;
  }

  /**
   * Cria um `Item` (conexão bancária) diretamente via API, repassando as
   * credenciais coletadas pelo formulário nativo do app. NUNCA logar
   * `parameters` (contém credenciais bancárias em texto puro) — nem aqui, nem
   * no helper `requestItemMutation`.
   */
  async createItem(
    connectorId: number,
    parameters: Record<string, string>,
    options: CreateItemOptions = {},
  ): Promise<PluggyItem> {
    const apiKey = await this.getApiKey();
    return this.requestItemMutation("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ connectorId, parameters, ...options }),
    });
  }

  /**
   * Envia o valor de MFA solicitado pelo Pluggy para um item em
   * `WAITING_USER_INPUT`. NUNCA logar `mfaParameters` (contém o código/valor
   * de segundo fator em texto puro).
   */
  async sendItemMfa(
    itemId: string,
    mfaParameters: Record<string, string>,
  ): Promise<PluggyItem> {
    const apiKey = await this.getApiKey();
    return this.requestItemMutation(
      `/items/${encodeURIComponent(itemId)}/mfa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
        body: JSON.stringify(mfaParameters),
      },
    );
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
   * Variante de `request()` usada por `createItem`/`sendItemMfa`: mapeia os
   * erros de negócio conhecidos do Pluggy (`codeDescription`) para exceções
   * mais específicas do que o `UpstreamErrorAppException` genérico. Assim
   * como `request()`, NUNCA loga `init.body` (que contém as credenciais
   * enviadas) — apenas status HTTP e o `codeDescription` (metadado do
   * Pluggy, não contém valores de credencial).
   */
  private async requestItemMutation(
    path: string,
    init: RequestInit,
  ): Promise<PluggyItem> {
    let response: Response;
    try {
      response = await fetch(`${PLUGGY_BASE_URL}${path}`, init);
    } catch (error) {
      this.logger.error(
        `Falha ao comunicar com o Pluggy (${path})`,
        error as Error,
      );
      throw new UpstreamErrorAppException();
    }

    if (!response.ok) {
      let body: { codeDescription?: string; message?: string } | undefined;
      try {
        body = (await response.json()) as
          { codeDescription?: string; message?: string } | undefined;
      } catch {
        // corpo de erro não é JSON válido — segue com body undefined
      }

      this.logger.error(
        `Pluggy API respondeu ${response.status} em ${path} (codeDescription=${body?.codeDescription ?? "desconhecido"})`,
      );

      if (body?.codeDescription === "CONNECTOR_VALIDATION_ERROR") {
        throw new BadUserInputAppException(
          "Uma ou mais credenciais informadas são inválidas para esta instituição.",
        );
      }
      if (body?.codeDescription === "ITEM_USER_ALREADY_EXISTS") {
        throw new ConflictAppException(
          "Já existe uma conexão em andamento para esta instituição com estas credenciais.",
        );
      }
      throw new UpstreamErrorAppException();
    }

    try {
      return (await response.json()) as PluggyItem;
    } catch (error) {
      this.logger.error(
        `Falha ao interpretar resposta do Pluggy (${path})`,
        error as Error,
      );
      throw new UpstreamErrorAppException();
    }
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
