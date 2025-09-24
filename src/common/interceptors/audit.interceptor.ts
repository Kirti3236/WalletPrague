import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog } from '../../models/audit-log.model';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const actorId = req.user?.id || null;
    const ip = req.ip;
    const ua = req.headers['user-agent'];

    return next.handle().pipe(
      tap(async (resBody) => {
        // Minimal request auditing: avoid PII
        await AuditLog.create({
          entity_type: 'http_request',
          entity_id: 'n/a' as any,
          action: `${req.method} ${req.originalUrl}`,
          actor_id: actorId,
          actor_type: actorId ? 'user' : 'system',
          old_values: null as any,
          new_values: null as any,
          ip_address: ip,
          user_agent: ua,
        } as any).catch(() => undefined);
      }),
    );
  }
}


