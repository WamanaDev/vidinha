import { NestFactory } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AppModule } from "../../src/app.module";
import { OpenFinanceService } from "../../src/modules/open-finance/open-finance.service";

/**
 * Webhook REST do Pluggy, separado do endpoint GraphQL principal
 * (`api/graphql.ts`). Não passa pelo `JwtAuthGuard` global (não há usuário
 * autenticado aqui) — autenticado por segredo compartilhado
 * (`PLUGGY_WEBHOOK_SECRET`), conforme
 * specs/backend/common/vercel-serverless-handler.md §"Suposições" e
 * specs/backend/modules/open-finance/open-finance.module.md §2.
 *
 * Formato real do payload confirmado pelo usuário:
 * ```json
 * { "event": "item/updated" | "item/created" | "item/error", "eventId": "...", "itemId": "...", "error"?: {...} }
 * ```
 *
 * A doc do Pluggy exige responder 2XX em até 5s — nenhum trabalho pesado
 * (buscar contas/transações) roda de forma síncrona antes do `res.json`: a
 * validação do secret é a única coisa aguardada antes de responder;
 * `processEvent(...)` é disparada intencionalmente sem `await` (fire-and-forget).
 * SUPOSIÇÃO: como funções serverless da Vercel podem ser encerradas logo após
 * a resposta ser enviada (sem garantia de execução em segundo plano), o
 * processamento disparado aqui é best-effort — se o container for reciclado
 * antes de `processEvent` terminar, a atualização de status fica pendente até
 * o próximo evento de webhook, o próximo `syncOpenFinanceConnection` manual do
 * usuário, ou o job diário de reconciliação (fora do escopo deste módulo).
 * Não há fila configurada no MVP para garantir a execução completa.
 */
let cachedAppContext:
  Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

async function getOpenFinanceService(): Promise<OpenFinanceService> {
  if (!cachedAppContext) {
    cachedAppContext = await NestFactory.createApplicationContext(AppModule, {
      logger: ["error", "warn"],
    });
  }
  return cachedAppContext.get(OpenFinanceService);
}

/**
 * Validação do segredo do webhook, isolada nesta função para ser fácil de
 * trocar quando o mecanismo real do Pluggy for confirmado.
 *
 * SUPOSIÇÃO (ainda não confirmada com a doc oficial do Pluggy para este caso
 * específico): o segredo é enviado como query param `?webhookSecret=...` na
 * URL do webhook configurada no Pluggy Dashboard. Caso o Pluggy real use um
 * header (ex.: `X-Pluggy-Signature`, possivelmente um HMAC do corpo em vez de
 * um segredo estático), trocar apenas a extração abaixo — nenhuma outra parte
 * do handler depende de como o segredo chega.
 */
function verifyWebhookSecret(req: VercelRequest): boolean {
  const expected = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!expected) return false; // fail secure: sem segredo configurado, nenhum webhook é aceito

  const received = req.query.webhookSecret;
  const providedSecret = Array.isArray(received) ? received[0] : received;
  if (!providedSecret) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(providedSecret);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

interface PluggyWebhookPayload {
  event: "item/created" | "item/updated" | "item/error" | string;
  eventId?: string;
  itemId?: string;
  error?: unknown;
}

/**
 * Processa o evento de forma assíncrona, depois que a resposta HTTP já foi
 * enviada ao Pluggy. Erros aqui nunca devem propagar (evita retries
 * agressivos do provedor por uma falha do nosso lado); ficam só nos logs do
 * `OpenFinanceService`/`PluggyClientService`.
 */
async function processEvent(body: PluggyWebhookPayload): Promise<void> {
  if (!body.itemId) return;

  try {
    const openFinanceService = await getOpenFinanceService();

    switch (body.event) {
      case "item/created":
        // A criação efetiva do registro já acontece via mutation
        // `createOpenFinanceConnection` (disparada pelo client logo após o
        // Pluggy Connect concluir o fluxo) — aqui só auditamos a chegada do
        // evento assíncrono correspondente, sem duplicar a criação.
        await openFinanceService.applyWebhookCreated(body.itemId);
        break;
      case "item/updated":
        await openFinanceService.applyWebhookUpdate(body.itemId);
        break;
      case "item/error":
        await openFinanceService.applyWebhookError(body.itemId, body.error);
        break;
      default:
        // Evento desconhecido/não tratado neste MVP — ignorado silenciosamente.
        break;
    }
  } catch {
    // Best-effort: nunca deixamos uma falha de processamento vazar (o handler
    // HTTP já respondeu 200 antes deste ponto).
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!verifyWebhookSecret(req)) {
    // Resposta genérica — nunca revelar se o segredo estava perto de bater
    // (ver specs/backend/common/exception-filter.md sobre não vazar detalhes).
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as PluggyWebhookPayload | undefined;

  // Responde imediatamente (requisito do Pluggy: 2XX em até 5s) e só então
  // dispara o processamento — sem `await`, propositalmente fire-and-forget.
  res.status(200).json({ received: true });

  if (body) {
    void processEvent(body);
  }
}
