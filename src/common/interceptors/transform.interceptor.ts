import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  traceId: string;
  timestamp: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const traceId = request.headers['x-trace-id'] as string;
    const method = request.method;

    // Determine if this is a GET operation (should include data)
    const isGetOperation = method === 'GET';
    
    return next.handle().pipe(
      map((data) => {
        const baseResponse = {
          success: true,
          traceId,
          timestamp: new Date().toISOString(),
        };

        // Handle paginated responses (always include data for pagination)
        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          return {
            ...baseResponse,
            data: data.items,
            meta: data.meta,
          };
        }

        // For GET operations, always include data field
        if (isGetOperation) {
          return {
            ...baseResponse,
            data,
          };
        }

        // For non-GET operations (POST, PUT, PATCH, DELETE), handle differently
        if (data && typeof data === 'object') {
          const response: any = { ...baseResponse };
          
          // Include message if it exists
          if ('message' in data) {
            response.message = data.message;
          }
          
          // For auth responses that have success/message structure, extract them
          if ('success' in data && 'message' in data) {
            response.success = data.success;
            response.message = data.message;
            // Only include data for successful operations that have meaningful data
            if (data.success && 'data' in data && data.data && data.data !== null) {
              response.data = data.data;
            }
          }
          
          return response;
        }

        // Fallback for simple responses
        return baseResponse;
      }),
    );
  }
}
