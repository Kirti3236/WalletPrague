import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { StatusCode, StatusCodeMessages, HttpStatusMapping } from '../constants/status-codes';
import { randomUUID } from 'crypto';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: StatusCode;
  status?: number;
  errors?: any[];
  traceId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: StatusCode;
  status: number;
  errors?: any[];
  traceId: string;
  timestamp: string;
}

@Injectable()
export class ResponseService {
  constructor(private readonly i18n: I18nService) {}

  success<T>(
    data?: T,
    statusCode: StatusCode = StatusCode.SUCCESS,
    customMessage?: string,
    lang?: string
  ): ApiResponse<T> {
    const message = customMessage || this.i18n.t(StatusCodeMessages[statusCode], { lang });
    
    return {
      success: true,
      data,
      message,
      code: statusCode,
      status: HttpStatusMapping[statusCode],
      traceId: randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  error(
    statusCode: StatusCode,
    customMessage?: string,
    errors?: any[],
    lang?: string
  ): ApiErrorResponse {
    const message = customMessage || this.i18n.t(StatusCodeMessages[statusCode], { lang }) || statusCode;

    return {
      success: false,
      message,
      code: statusCode,
      status: HttpStatusMapping[statusCode],
      errors,
      traceId: randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }

  created<T>(data?: T, customMessage?: string, lang?: string): ApiResponse<T> {
    return this.success(data, StatusCode.CREATED, customMessage, lang);
  }

  updated<T>(data?: T, customMessage?: string, lang?: string): ApiResponse<T> {
    return this.success(data, StatusCode.UPDATED, customMessage, lang);
  }

  deleted(customMessage?: string, lang?: string): ApiResponse<null> {
    return this.success(null, StatusCode.DELETED, customMessage, lang);
  }

  badRequest(customMessage?: string, errors?: any[], lang?: string): ApiErrorResponse {
    return this.error(StatusCode.BAD_REQUEST, customMessage, errors, lang);
  }

  unauthorized(customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.UNAUTHORIZED, customMessage, undefined, lang);
  }

  forbidden(customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.FORBIDDEN, customMessage, undefined, lang);
  }

  notFound(customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.NOT_FOUND, customMessage, undefined, lang);
  }

  conflict(customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.CONFLICT, customMessage, undefined, lang);
  }

  validationError(errors?: any[], customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.VALIDATION_ERROR, customMessage, errors, lang);
  }

  internalServerError(customMessage?: string, lang?: string): ApiErrorResponse {
    return this.error(StatusCode.INTERNAL_SERVER_ERROR, customMessage, undefined, lang);
  }

  // Auth specific responses
  invalidCredentials(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.INVALID_CREDENTIALS, undefined, undefined, lang);
  }

  tokenExpired(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.TOKEN_EXPIRED, undefined, undefined, lang);
  }

  invalidToken(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.INVALID_TOKEN, undefined, undefined, lang);
  }

  sessionExpired(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.SESSION_EXPIRED, undefined, undefined, lang);
  }

  accountLocked(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.ACCOUNT_LOCKED, undefined, undefined, lang);
  }

  accountInactive(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.ACCOUNT_INACTIVE, undefined, undefined, lang);
  }

  emailAlreadyExists(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.EMAIL_ALREADY_EXISTS, undefined, undefined, lang);
  }

  phoneAlreadyExists(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.PHONE_ALREADY_EXISTS, undefined, undefined, lang);
  }

  documentAlreadyExists(lang?: string): ApiErrorResponse {
    return this.error(StatusCode.DOCUMENT_ALREADY_EXISTS, undefined, undefined, lang);
  }
}
