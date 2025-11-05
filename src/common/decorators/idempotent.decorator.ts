import {
  applyDecorators,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of, EMPTY } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getModelToken } from '@nestjs/sequelize';
import { IdempotencyKey } from '../../models/idempotency-key.model';

/**
 * Idempotency Interceptor - Handles idempotency key checking and response caching
 * Implements Stripe-pattern idempotency
 */
@Injectable()
export class IdempotentInterceptor implements NestInterceptor {
  constructor(
    @Inject(getModelToken(IdempotencyKey))
    private readonly idempotencyKeyModel: typeof IdempotencyKey,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply to POST and PUT requests
    if (!['POST', 'PUT'].includes(request.method)) {
      return next.handle();
    }

    // Get idempotency key from header (case-insensitive)
    const idempotencyKey = this.getIdempotencyKey(request);

    // Idempotency key is optional for now, but will be required
    if (!idempotencyKey) {
      return next.handle();
    }

    // Get user ID from JWT token
    const userId = request.user?.id;
    if (!userId) {
      return next.handle();
    }

    // Check if idempotency key already exists
    try {
      const existingRecord = await this.idempotencyKeyModel.findOne({
        where: {
          user_id: userId,
          idempotency_key: idempotencyKey,
        },
      });

      if (existingRecord) {
        // Check if key has expired
        if (new Date() > existingRecord.expires_at) {
          // Key expired, proceed with request
          await existingRecord.destroy();
        } else {
          // Return cached response
          response.status(existingRecord.http_status_code).json({
            success: true,
            statusCode: existingRecord.http_status_code,
            message: 'Duplicate request (cached response)',
            data: existingRecord.response_payload,
            isDuplicate: true,
            timestamp: new Date().toISOString(),
          });
          return EMPTY; // Return empty observable to complete the stream
        }
      }
    } catch (error) {
      console.error('Error checking idempotency key:', error);
      // Continue with request on error
    }

    // Proceed with the request and cache the response
    return next.handle().pipe(
      tap(async (data) => {
        try {
          const statusCode = response.statusCode || 200;

          // Only cache successful responses (2xx)
          if (statusCode >= 200 && statusCode < 300) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await this.idempotencyKeyModel.create({
              user_id: userId,
              idempotency_key: idempotencyKey,
              response_payload: data,
              http_status_code: statusCode,
              expires_at: expiresAt,
            }).catch((error) => {
              // Handle duplicate key from concurrent request
              if (error.name !== 'SequelizeUniqueConstraintError') {
                console.error('Error storing idempotency key:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error in idempotent interceptor:', error);
          // Don't fail the request if we can't cache
        }
      }),
    );
  }

  private getIdempotencyKey(request: any): string | null {
    // Check for Idempotency-Key header (case-insensitive)
    const headers = request.headers || {};
    
    // Try exact case
    if (headers['idempotency-key']) {
      return headers['idempotency-key'];
    }

    // Try lowercase
    if (headers['Idempotency-Key']) {
      return headers['Idempotency-Key'];
    }

    // Try mixed case variations
    for (const key in headers) {
      if (key.toLowerCase() === 'idempotency-key') {
        return headers[key];
      }
    }

    return null;
  }
}

/**
 * Decorator to apply idempotency to a method
 * Must be used on POST/PUT endpoints
 * 
 * Usage:
 * @Idempotent()
 * @Post('transfer')
 * async transfer(@Body() dto: TransferDto) { ... }
 */
export function Idempotent() {
  return applyDecorators();
}
