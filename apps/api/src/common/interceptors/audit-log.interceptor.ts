import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";

/**
 * SUPOSIÇÃO: conforme specs/backend/modules/audit-log/audit-log.module.md §3, o
 * padrão adotado no módulo `family` (e recomendado para os demais) é a chamada
 * manual e explícita a `auditLog.record({...})` diretamente nos services, não o
 * decorator `@Audit()` + interceptor declarativo. Este interceptor é mantido
 * como no-op (apenas passthrough) para preencher a estrutura de pastas prevista
 * em specs/backend/00-overview.md e para servir de ponto de extensão futuro,
 * caso o time decida migrar para o padrão declarativo mais tarde.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle();
  }
}
