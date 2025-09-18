export enum StatusCode {
  // Success codes
  SUCCESS = 'SUCCESS',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',

  // Client error codes
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication specific codes
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',

  // Registration specific codes
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  DOCUMENT_ALREADY_EXISTS = 'DOCUMENT_ALREADY_EXISTS',

  // Server error codes
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const StatusCodeMessages = {
  [StatusCode.SUCCESS]: 'messages.success.general',
  [StatusCode.CREATED]: 'messages.success.created',
  [StatusCode.UPDATED]: 'messages.success.updated',
  [StatusCode.DELETED]: 'messages.success.deleted',

  [StatusCode.BAD_REQUEST]: 'messages.error.badRequest',
  [StatusCode.UNAUTHORIZED]: 'messages.error.unauthorized',
  [StatusCode.FORBIDDEN]: 'messages.error.forbidden',
  [StatusCode.NOT_FOUND]: 'messages.error.notFound',
  [StatusCode.CONFLICT]: 'messages.error.conflict',
  [StatusCode.VALIDATION_ERROR]: 'messages.error.validationError',

  [StatusCode.INVALID_CREDENTIALS]: 'messages.auth.invalidCredentials',
  [StatusCode.TOKEN_EXPIRED]: 'messages.auth.tokenExpired',
  [StatusCode.INVALID_TOKEN]: 'messages.auth.invalidToken',
  [StatusCode.SESSION_EXPIRED]: 'messages.auth.sessionExpired',
  [StatusCode.ACCOUNT_LOCKED]: 'messages.auth.accountLocked',
  [StatusCode.ACCOUNT_INACTIVE]: 'messages.auth.accountInactive',

  [StatusCode.EMAIL_ALREADY_EXISTS]: 'messages.auth.emailAlreadyExists',
  [StatusCode.PHONE_ALREADY_EXISTS]: 'messages.auth.phoneAlreadyExists',
  [StatusCode.DOCUMENT_ALREADY_EXISTS]: 'messages.auth.documentAlreadyExists',

  [StatusCode.INTERNAL_SERVER_ERROR]: 'messages.error.internalServerError',
  [StatusCode.SERVICE_UNAVAILABLE]: 'messages.error.serviceUnavailable',
  [StatusCode.DATABASE_ERROR]: 'messages.error.databaseError',
};

export const HttpStatusMapping = {
  [StatusCode.SUCCESS]: 200,
  [StatusCode.CREATED]: 201,
  [StatusCode.UPDATED]: 200,
  [StatusCode.DELETED]: 204,

  [StatusCode.BAD_REQUEST]: 400,
  [StatusCode.UNAUTHORIZED]: 401,
  [StatusCode.FORBIDDEN]: 403,
  [StatusCode.NOT_FOUND]: 404,
  [StatusCode.CONFLICT]: 409,
  [StatusCode.VALIDATION_ERROR]: 400,

  [StatusCode.INVALID_CREDENTIALS]: 401,
  [StatusCode.TOKEN_EXPIRED]: 401,
  [StatusCode.INVALID_TOKEN]: 401,
  [StatusCode.SESSION_EXPIRED]: 401,
  [StatusCode.ACCOUNT_LOCKED]: 423,
  [StatusCode.ACCOUNT_INACTIVE]: 403,

  [StatusCode.EMAIL_ALREADY_EXISTS]: 409,
  [StatusCode.PHONE_ALREADY_EXISTS]: 409,
  [StatusCode.DOCUMENT_ALREADY_EXISTS]: 409,

  [StatusCode.INTERNAL_SERVER_ERROR]: 500,
  [StatusCode.SERVICE_UNAVAILABLE]: 503,
  [StatusCode.DATABASE_ERROR]: 500,
};
