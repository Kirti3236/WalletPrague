import { HttpException } from '@nestjs/common';
import { StatusCode, HttpStatusMapping } from '../constants/status-codes';

export class ApiException extends HttpException {
  public readonly statusCode: StatusCode;
  public readonly errors?: any[];
  public readonly lang?: string;

  constructor(
    statusCode: StatusCode,
    message?: string,
    errors?: any[],
    lang?: string
  ) {
    super(message || statusCode, HttpStatusMapping[statusCode]);
    this.statusCode = statusCode;
    this.errors = errors;
    this.lang = lang;
  }
}

// Auth specific exceptions
export class InvalidCredentialsException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.INVALID_CREDENTIALS, message, undefined, lang);
  }
}

export class TokenExpiredException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.TOKEN_EXPIRED, message, undefined, lang);
  }
}

export class InvalidTokenException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.INVALID_TOKEN, message, undefined, lang);
  }
}

export class SessionExpiredException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.SESSION_EXPIRED, message, undefined, lang);
  }
}

export class AccountLockedException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.ACCOUNT_LOCKED, message, undefined, lang);
  }
}

export class AccountInactiveException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.ACCOUNT_INACTIVE, message, undefined, lang);
  }
}

export class EmailAlreadyExistsException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.EMAIL_ALREADY_EXISTS, message, undefined, lang);
  }
}

export class PhoneAlreadyExistsException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.PHONE_ALREADY_EXISTS, message, undefined, lang);
  }
}

export class DocumentAlreadyExistsException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.DOCUMENT_ALREADY_EXISTS, message, undefined, lang);
  }
}

export class ValidationException extends ApiException {
  constructor(errors?: any[], message?: string, lang?: string) {
    super(StatusCode.VALIDATION_ERROR, message, errors, lang);
  }
}

export class ResourceNotFoundException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.NOT_FOUND, message, undefined, lang);
  }
}

export class ResourceConflictException extends ApiException {
  constructor(message?: string, lang?: string) {
    super(StatusCode.CONFLICT, message, undefined, lang);
  }
}
