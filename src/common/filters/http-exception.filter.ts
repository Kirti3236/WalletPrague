import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AppException,
  AuthenticationException,
  ValidationException,
  TransactionException,
  ComplianceException,
  IntegrationException,
} from '../exceptions/app.exception';
import { ErrorCode, ERROR_CODE_HTTP_STATUS_MAP } from '../constants/error-codes';

/**
 * Global HTTP Exception Filter
 * Handles all exceptions and converts them to standardized error responses
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let appException: AppException;

    // Handle AppException and its subclasses
    if (exception instanceof AppException) {
      appException = exception;
    }
    // Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      appException = this.convertHttpException(exception, request.path);
    }
    // Handle validation errors from class-validator
    else if (this.isValidationError(exception)) {
      appException = this.handleValidationError(exception, request.path);
    }
    // Handle database errors (Sequelize)
    else if (this.isDatabaseError(exception)) {
      appException = this.handleDatabaseError(exception, request.path);
    }
    // Handle all other errors
    else {
      appException = this.handleUnknownError(exception, request.path);
    }

    // Note: path is readonly and set in constructor, cannot be updated here

    // Log the error
    this.logError(exception, appException, request);

    // Send response
    const errorResponse = appException.toResponse();
    response.status(appException.statusCode).json(errorResponse);
  }

  /**
   * Convert NestJS HttpException to AppException
   */
  private convertHttpException(
    exception: HttpException,
    path: string,
  ): AppException {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorCode: ErrorCode;
    let message: string;
    let details: Record<string, any> | undefined;

    // Try to extract error code and details from response
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as any;
      message = response.message || exception.message;
      details = response;

      // Map common HTTP statuses to error codes
      errorCode = this.mapStatusToErrorCode(status, message);
    } else {
      message = String(exceptionResponse);
      errorCode = this.mapStatusToErrorCode(status, message);
    }

    return new AppException(errorCode, message, details, path);
  }

  /**
   * Handle class-validator validation errors
   */
  private handleValidationError(
    exception: any,
    path: string,
  ): ValidationException {
    const validationErrors = Array.isArray(exception)
      ? exception.map((err: any) => ({
          field: err.property || 'unknown',
          message: Object.values(err.constraints || {}).join(', '),
          errorCode: ErrorCode.VALIDATION_FAILED,
        }))
      : [];

    return new ValidationException(
      'Validation failed',
      validationErrors,
      path,
    );
  }

  /**
   * Handle database/Sequelize errors
   */
  private handleDatabaseError(
    exception: any,
    path: string,
  ): AppException {
    const errorName = exception.name || '';

    // Unique constraint violation
    if (errorName.includes('SequelizeUniqueConstraintError')) {
      return new AppException(
        ErrorCode.RESOURCE_ALREADY_EXISTS,
        `Resource already exists`,
        {
          field: exception.fields,
          message: 'Duplicate entry',
        },
        path,
      );
    }

    // Foreign key constraint violation
    if (errorName.includes('SequelizeForeignKeyConstraintError')) {
      return new AppException(
        ErrorCode.RESOURCE_CONFLICT,
        'Invalid reference to related resource',
        {
          field: exception.fields,
          table: exception.table,
        },
        path,
      );
    }

    // Validation error
    if (errorName.includes('SequelizeValidationError')) {
      return new ValidationException(
        'Database validation failed',
        exception.errors?.map((err: any) => ({
          field: err.path || 'unknown',
          message: err.message,
        })),
        path,
      );
    }

    // Generic database error
    return new AppException(
      ErrorCode.DATABASE_ERROR,
      'Database operation failed',
      { errorName, message: exception.message },
      path,
    );
  }

  /**
   * Handle unknown/unexpected errors
   */
  private handleUnknownError(
    exception: unknown,
    path: string,
  ): AppException {
    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    return new AppException(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      {
        message: errorMessage,
        originalType: exception?.constructor?.name,
      },
      path,
    );
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusToErrorCode(status: number, message?: string): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.RESOURCE_CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      case HttpStatus.BAD_GATEWAY:
        return ErrorCode.EXTERNAL_SERVICE_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorCode.TIMEOUT_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Check if exception is a validation error
   */
  private isValidationError(exception: any): boolean {
    return (
      Array.isArray(exception) &&
      exception.length > 0 &&
      exception[0].property !== undefined
    );
  }

  /**
   * Check if exception is a database error
   */
  private isDatabaseError(exception: any): boolean {
    const name = exception?.name || '';
    return name.includes('Sequelize');
  }

  /**
   * Log error with appropriate level
   */
  private logError(
    exception: unknown,
    appException: AppException,
    request: Request,
  ) {
    const logData = {
      ...appException.toLog(),
      method: request.method,
      path: request.path,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };

    // Log level based on status code
    if (appException.statusCode >= 500) {
      this.logger.error(
        `[${appException.errorCode}] ${appException.message}`,
        JSON.stringify(logData, null, 2),
      );
    } else if (appException.statusCode >= 400) {
      this.logger.warn(
        `[${appException.errorCode}] ${appException.message}`,
        logData,
      );
    } else {
      this.logger.debug(
        `[${appException.errorCode}] ${appException.message}`,
        logData,
      );
    }

    // Log compliance errors separately
    if (
      appException instanceof ComplianceException &&
      appException.requiresManualReview
    ) {
      this.logger.error(
        `⚠️ COMPLIANCE ALERT [${appException.errorCode}]: Requires manual review`,
        JSON.stringify(logData, null, 2),
      );
    }
  }
}
