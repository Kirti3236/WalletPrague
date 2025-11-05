import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction } from '../../../models/audit-log.model';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const user = request.user;
    const ip = this.getClientIp(request);
    const userAgent = request.get('user-agent');
    const method = request.method;
    const path = request.path;

    // Map HTTP methods to audit actions
    const actionMap: { [key: string]: AuditAction } = {
      'POST:/v1/private/user/transfers': AuditAction.TRANSFER_INITIATED,
      'POST:/v1/private/user/deposits': AuditAction.DEPOSIT_INITIATED,
      'POST:/v1/private/user/withdrawals': AuditAction.WITHDRAWAL_INITIATED,
      'POST:/v1/private/user/login': AuditAction.USER_LOGIN,
      'POST:/v1/private/user/logout': AuditAction.USER_LOGOUT,
      'POST:/v1/private/user/register': AuditAction.USER_REGISTRATION,
      'PUT:/v1/private/user/profile': AuditAction.USER_PROFILE_UPDATE,
      'POST:/v1/private/admin/limit-policies': AuditAction.ADMIN_CREATE_POLICY,
      'PUT:/v1/private/admin/limit-policies': AuditAction.ADMIN_UPDATE_POLICY,
    };

    const key = `${method}:${path}`;
    const action = this.mapToAuditAction(method, path);

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        const status = response.statusCode;

        // Log successful request
        this.auditLogService.logAction({
          user_id: user?.id,
          action,
          resource_type: this.getResourceType(path),
          resource_id: this.extractResourceId(request, path),
          after_state: this.extractResponseData(data),
          ip_address: ip,
          user_agent: userAgent,
          status: status >= 200 && status < 300 ? 'success' : 'partial',
          response_time_ms: responseTime,
          is_compliance_relevant: this.isComplianceAction(action),
        }).catch((err) => {
          console.error('Error logging audit action:', err);
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log failed request
        this.auditLogService.logAction({
          user_id: user?.id,
          action,
          resource_type: this.getResourceType(path),
          resource_id: this.extractResourceId(request, path),
          ip_address: ip,
          user_agent: userAgent,
          status: 'failure',
          error_message: error.message,
          response_time_ms: responseTime,
          is_compliance_relevant: this.isComplianceAction(action),
        }).catch((err) => {
          console.error('Error logging audit action:', err);
        });

        throw error;
      }),
    );
  }

  private mapToAuditAction(method: string, path: string): AuditAction {
    if (path.includes('transfer') && method === 'POST')
      return AuditAction.TRANSFER_INITIATED;
    if (path.includes('deposit') && method === 'POST')
      return AuditAction.DEPOSIT_INITIATED;
    if (path.includes('withdrawal') && method === 'POST')
      return AuditAction.WITHDRAWAL_INITIATED;
    if (path.includes('login') && method === 'POST') return AuditAction.USER_LOGIN;
    if (path.includes('logout') && method === 'POST') return AuditAction.USER_LOGOUT;
    if (path.includes('register') && method === 'POST')
      return AuditAction.USER_REGISTRATION;
    if (path.includes('profile') && method === 'PUT')
      return AuditAction.USER_PROFILE_UPDATE;

    // Default to generic action based on method
    return AuditAction.USER_LOGIN; // Fallback
  }

  private getResourceType(path: string): string {
    if (path.includes('transfer')) return 'transfer';
    if (path.includes('deposit')) return 'deposit';
    if (path.includes('withdrawal')) return 'withdrawal';
    if (path.includes('user')) return 'user';
    if (path.includes('limit')) return 'limit_policy';
    return 'unknown';
  }

  private extractResourceId(request: any, path: string): string | undefined {
    // Try to extract ID from URL params or body
    if (request.params?.id) return request.params.id;
    if (request.body?.id) return request.body.id;
    if (request.body?.user_id) return request.body.user_id;
    if (request.body?.transfer_id) return request.body.transfer_id;
    return undefined;
  }

  private extractResponseData(data: any): Record<string, any> | undefined {
    if (!data) return undefined;
    // Extract only safe, non-sensitive fields
    if (typeof data === 'object' && data.id) {
      return { id: data.id, status: data.status, created_at: data.created_at };
    }
    return undefined;
  }

  private isComplianceAction(action: AuditAction): boolean {
    const complianceActions = [
      AuditAction.TRANSFER_COMPLETED,
      AuditAction.TRANSFER_REVERSED,
      AuditAction.DEPOSIT_COMPLETED,
      AuditAction.WITHDRAWAL_COMPLETED,
      AuditAction.ADMIN_SUSPEND_USER,
      AuditAction.ADMIN_UNSUSPEND_USER,
    ];
    return complianceActions.includes(action);
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
