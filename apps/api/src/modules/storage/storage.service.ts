import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UpstreamErrorAppException } from "@common/errors/app.exceptions";

const STORAGE_API_PREFIX = "/storage/v1";

/** Bucket privado criado manualmente no Supabase Storage (não gerenciado por este código). */
const AVATARS_BUCKET = "avatars";

/**
 * Cliente HTTP dedicado à API REST do Supabase Storage — isola toda chamada
 * externa (PoLP), seguindo o mesmo padrão defensivo de `PluggyClientService`
 * (`open-finance/pluggy-client.service.ts`): nenhum erro cru do `fetch`/da
 * API do Supabase deve vazar para fora deste serviço, sempre convertido para
 * `UpstreamErrorAppException`. NUNCA logar o conteúdo de um arquivo, nem a
 * `SUPABASE_SERVICE_ROLE_KEY`.
 *
 * Contratos confirmados manualmente contra a API REST do Supabase Storage
 * (bucket privado `avatars`, ver specs/security/file-uploads.md):
 * - `POST /object/upload/sign/:bucket/:path` -> `{ url, token }` (URL de
 *   upload assinada, curta duração).
 * - `POST /object/sign/:bucket/:path` -> `{ signedURL }` (URL de leitura
 *   assinada, duração configurável via `expiresIn`).
 * - `DELETE /object/:bucket/:path` -> remove o objeto.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Gera uma URL de upload assinada de curta duração para `path` dentro do
   * bucket `avatars`. Nunca cacheada — o token tem validade curta (SUPOSIÇÃO:
   * não documentada formalmente pelo Supabase; gerar sob demanda a cada
   * solicitação, nunca reutilizar).
   */
  async createUploadUrl(path: string): Promise<string> {
    const body = await this.request<{ url: string; token: string }>(
      `/object/upload/sign/${AVATARS_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          ...this.authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    return `${this.getBaseUrl()}${STORAGE_API_PREFIX}${body.url}`;
  }

  /**
   * Gera uma URL de leitura assinada para `path` dentro do bucket `avatars`,
   * válida por `expiresInSeconds` (default 1h). Deve ser chamada sob demanda
   * toda vez que um `avatarUrl` de `User` for serializado para o GraphQL —
   * nunca persistir/cachear a URL assinada em si (só o `path`).
   */
  async createReadUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const body = await this.request<{ signedURL: string }>(
      `/object/sign/${AVATARS_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          ...this.authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
    );
    return `${this.getBaseUrl()}${STORAGE_API_PREFIX}${body.signedURL}`;
  }

  /** Remove um objeto do bucket `avatars` (usado ao trocar de avatar). */
  async deleteObject(path: string): Promise<void> {
    await this.request<unknown>(`/object/${AVATARS_BUCKET}/${path}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }

  /**
   * Helper de conveniência usado por todos os pontos que hoje serializam
   * `avatarUrl` de um `User` para o GraphQL: computa a signed READ URL a
   * partir do `path` salvo em `User.avatarUrl`, ou retorna `undefined` sem
   * chamar o Storage quando não há avatar. Evita duplicar o `if (!path)
   * return undefined` em cada `toEntity` de cada módulo.
   */
  async resolveAvatarUrl(path?: string | null): Promise<string | undefined> {
    if (!path) return undefined;
    return this.createReadUrl(path);
  }

  private authHeaders(): Record<string, string> {
    const key = this.getServiceRoleKey();
    return { Authorization: `Bearer ${key}`, apikey: key };
  }

  private getBaseUrl(): string {
    const url = this.config.get<string>("SUPABASE_URL");
    if (!url) {
      throw new UpstreamErrorAppException(
        "Armazenamento de arquivos não está configurado.",
      );
    }
    return url.replace(/\/$/, "");
  }

  private getServiceRoleKey(): string {
    const key = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) {
      throw new UpstreamErrorAppException(
        "Armazenamento de arquivos não está configurado.",
      );
    }
    return key;
  }

  /**
   * Wrapper de baixo nível: nunca deixa o erro cru do `fetch`/Supabase vazar
   * para fora deste serviço — sempre convertido para
   * `UpstreamErrorAppException`. NUNCA loga `init.body`/headers (podem conter
   * a service role key ou, futuramente, dados sensíveis).
   */
  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const baseUrl = this.getBaseUrl();
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${STORAGE_API_PREFIX}${path}`, init);
    } catch (error) {
      this.logger.error(
        `Falha ao comunicar com o Supabase Storage (${path})`,
        error as Error,
      );
      throw new UpstreamErrorAppException();
    }

    if (!response.ok) {
      this.logger.error(
        `Supabase Storage respondeu ${response.status} em ${path}`,
      );
      throw new UpstreamErrorAppException();
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      this.logger.error(
        `Falha ao interpretar resposta do Supabase Storage (${path})`,
        error as Error,
      );
      throw new UpstreamErrorAppException();
    }
  }
}
