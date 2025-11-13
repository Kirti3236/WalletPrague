import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { randomUUID } from 'crypto';
import { ApiException } from '../exceptions/api.exception';
import { AppException } from '../exceptions/app.exception';
import { ResponseService } from '../services/response.service';
import { StatusCode } from '../constants/status-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private readonly responseService: ResponseService,
    private readonly i18n: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = request.headers['accept-language']?.split(',')[0] || 'en';

    let errorResponse: any;

    if (exception instanceof AppException) {
      // Handle AppException and its subclasses (LimitExceededException, etc.)
      // Use the AppException's built-in response format
      errorResponse = exception.toResponse();
    } else if (exception instanceof ApiException) {
      // Handle custom API exceptions
      errorResponse = this.responseService.error(
        exception.statusCode,
        exception.message,
        exception.errors,
        exception.lang || lang,
      );
    } else if (exception instanceof HttpException) {
      // Handle standard HTTP exceptions
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let errors: any[] | undefined;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errors = responseObj.errors || responseObj.details;
      } else {
        message = exceptionResponse;
      }

      // Map HTTP status to our status codes
      const statusCode = this.mapHttpStatusToStatusCode(status);
      errorResponse = this.responseService.error(
        statusCode,
        message,
        errors,
        lang,
      );
    } else {
      // Unhandled exceptions
      const traceId = randomUUID();

      // Log the full error for debugging
      this.logger.error(
        `Unhandled exception: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
        `TraceId: ${traceId}`,
      );

      errorResponse = this.responseService.internalServerError(undefined, lang);
    }

    // Log the error with trace ID
    const traceId = errorResponse.traceId || randomUUID();
    const statusCode = errorResponse.status || errorResponse.statusCode || 500;
    const errorCode = errorResponse.code || errorResponse.errorCode || 'UNKNOWN';
    const message = errorResponse.message || 'Internal server error';
    
    this.logger.error(
      `${request.method} ${request.url} - ${statusCode} ${errorCode}: ${message}`,
      `TraceId: ${traceId}`,
    );

    response.status(statusCode).json(errorResponse);
  }

  private mapHttpStatusToStatusCode(status: number): StatusCode {
    const statusMapping = {
      400: StatusCode.BAD_REQUEST,
      401: StatusCode.UNAUTHORIZED,
      403: StatusCode.FORBIDDEN,
      404: StatusCode.NOT_FOUND,
      409: StatusCode.CONFLICT,
      422: StatusCode.VALIDATION_ERROR,
      500: StatusCode.INTERNAL_SERVER_ERROR,
      503: StatusCode.SERVICE_UNAVAILABLE,
    };

    return statusMapping[status] || StatusCode.INTERNAL_SERVER_ERROR;
  }
}
