import {
  ErrorCode,
  ERROR_CODE_HTTP_STATUS_MAP,
  ERROR_CODE_MESSAGES,
  ErrorResponse,
} from '../constants/error-codes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Exception class for all YaPague errors
 * Automatically maps error codes to HTTP status codes and messages
 */
export class AppException extends Error {
  public readonly errorCode: ErrorCode;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly details?: Record<string, any>;
  public readonly timestamp: string;
  public readonly traceId: string;
  public readonly path?: string;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    path?: string,
  ) {
    // Get default message from error code if not provided
    const finalMessage = message || ERROR_CODE_MESSAGES[errorCode];

    super(finalMessage);

    this.errorCode = errorCode;
    this.message = finalMessage;
    this.statusCode = ERROR_CODE_HTTP_STATUS_MAP[errorCode] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.traceId = uuidv4();
    this.path = path;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppException.prototype);
  }

  /**
   * Convert exception to API response format
   */
  public toResponse(): ErrorResponse {
    return {
      success: false,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
      path: this.path,
    };
  }

  /**
   * Convert exception to log format
   */
  public toLog(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
      path: this.path,
      stack: this.stack,
    };
  }
}

/**
 * Authentication & Authorization Errors
 */
export class AuthenticationException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    message?: string,
    details?: Record<string, any>,
  ) {
    super(
      errorCode,
      message,
      details,
    );
    Object.setPrototypeOf(this, AuthenticationException.prototype);
  }
}

/**
 * Validation Errors
 */
export class ValidationException extends AppException {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    errorCode: ErrorCode;
  }>;

  constructor(
    message?: string,
    validationErrors?: Array<{ field: string; message: string; errorCode?: ErrorCode }>,
    path?: string,
  ) {
    const details =
      validationErrors && validationErrors.length > 0
        ? { errors: validationErrors }
        : undefined;

    super(
      ErrorCode.VALIDATION_FAILED,
      message || 'Validation failed',
      details,
      path,
    );

    this.validationErrors = (validationErrors || []).map((err) => ({
      field: err.field,
      message: err.message,
      errorCode: err.errorCode || ErrorCode.VALIDATION_FAILED,
    }));

    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * Transaction/Business Logic Errors
 */
export class TransactionException extends AppException {
  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    path?: string,
  ) {
    super(errorCode, message, details, path);
    Object.setPrototypeOf(this, TransactionException.prototype);
  }
}

/**
 * Compliance & Risk Errors
 */
export class ComplianceException extends AppException {
  public readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  public readonly requiresManualReview: boolean;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    requiresManualReview: boolean = false,
  ) {
    super(errorCode, message, details);
    this.riskLevel = riskLevel;
    this.requiresManualReview = requiresManualReview;
    Object.setPrototypeOf(this, ComplianceException.prototype);
  }

  /**
   * Override toLog to include compliance metadata
   */
  public toLog(): Record<string, any> {
    return {
      ...super.toLog(),
      riskLevel: this.riskLevel,
      requiresManualReview: this.requiresManualReview,
      complianceAlert: true,
    };
  }
}

/**
 * External Service Integration Errors
 */
export class IntegrationException extends AppException {
  public readonly externalService: string;
  public readonly originalError?: any;

  constructor(
    errorCode: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    message?: string,
    externalService?: string,
    originalError?: any,
  ) {
    super(errorCode, message, {
      externalService,
      originalErrorMessage: originalError?.message,
    });

    this.externalService = externalService || 'unknown';
    this.originalError = originalError;
    Object.setPrototypeOf(this, IntegrationException.prototype);
  }
}

/**
 * Resource Not Found Error
 */
export class NotFoundException extends AppException {
  constructor(
    resourceType: string,
    resourceId?: string,
    path?: string,
  ) {
    const message = resourceId
      ? `${resourceType} with ID ${resourceId} not found`
      : `${resourceType} not found`;

    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      message,
      { resourceType, resourceId },
      path,
    );

    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

/**
 * Conflict Error (e.g., duplicate resource, state conflict)
 */
export class ConflictException extends AppException {
  constructor(
    message: string,
    errorCode: ErrorCode = ErrorCode.RESOURCE_CONFLICT,
    details?: Record<string, any>,
    path?: string,
  ) {
    super(errorCode, message, details, path);
    Object.setPrototypeOf(this, ConflictException.prototype);
  }
}

/**
 * Rate Limit / Limit Exceeded Error
 */
export class LimitExceededException extends AppException {
  public readonly limitType: string;
  public readonly currentValue: number;
  public readonly limit: number;
  public readonly resetAt?: Date;

  constructor(
    limitType: string,
    currentValue: number,
    limit: number,
    errorCode: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
    resetAt?: Date,
    message?: string,
  ) {
    const finalMessage =
      message ||
      `${limitType} limit exceeded (${currentValue}/${limit})`;

    super(
      errorCode,
      finalMessage,
      {
        limitType,
        currentValue,
        limit,
        resetAt: resetAt?.toISOString(),
      },
    );

    this.limitType = limitType;
    this.currentValue = currentValue;
    this.limit = limit;
    this.resetAt = resetAt;

    Object.setPrototypeOf(this, LimitExceededException.prototype);
  }
}

/**
 * Insufficient Balance Error
 */
export class InsufficientBalanceException extends AppException {
  public readonly available: number;
  public readonly required: number;
  public readonly shortfall: number;

  constructor(available: number, required: number) {
    const shortfall = required - available;

    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance (available: ${available}, required: ${required})`,
      { available, required, shortfall },
    );

    this.available = available;
    this.required = required;
    this.shortfall = shortfall;

    Object.setPrototypeOf(this, InsufficientBalanceException.prototype);
  }
}
