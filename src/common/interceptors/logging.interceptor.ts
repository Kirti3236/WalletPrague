import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate trace ID if not present
    const traceId = (request.headers['x-trace-id'] as string) || randomUUID();
    request.headers['x-trace-id'] = traceId;
    response.setHeader('X-Trace-Id', traceId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = (request as any).user?.id || 'anonymous';

    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - IP: ${ip} - User: ${userId} - TraceId: ${traceId} - UserAgent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${duration}ms - TraceId: ${traceId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `Error Response: ${method} ${url} - ${statusCode} - ${duration}ms - TraceId: ${traceId}`,
            error.stack,
          );
        },
      }),
    );
  }
}
