export const ERROR_DICTIONARY = {
  // Authentication & Authorization Errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    httpStatus: 401,
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    httpStatus: 401,
  },
  ACCESS_TOKEN_EXPIRED: {
    code: 'ACCESS_TOKEN_EXPIRED',
    message: 'Access token has expired',
    httpStatus: 401,
  },
  REFRESH_TOKEN_EXPIRED: {
    code: 'REFRESH_TOKEN_EXPIRED',
    message: 'Refresh token has expired',
    httpStatus: 401,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions to perform this action',
    httpStatus: 403,
  },

  // User Management Errors
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    httpStatus: 404,
  },
  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    message: 'User with this email already exists',
    httpStatus: 409,
  },
  ACCOUNT_SUSPENDED: {
    code: 'ACCOUNT_SUSPENDED',
    message: 'User account is suspended',
    httpStatus: 403,
  },
  ACCOUNT_BLOCKED: {
    code: 'ACCOUNT_BLOCKED',
    message: 'User account is blocked',
    httpStatus: 403,
  },

  // Account & Wallet Errors
  ACCOUNT_NOT_FOUND: {
    code: 'ACCOUNT_NOT_FOUND',
    message: 'Account not found',
    httpStatus: 404,
  },
  WALLET_NOT_FOUND: {
    code: 'WALLET_NOT_FOUND',
    message: 'Wallet not found',
    httpStatus: 404,
  },
  WALLET_FROZEN: {
    code: 'WALLET_FROZEN',
    message: 'Wallet is frozen and cannot be used',
    httpStatus: 403,
  },
  WALLET_CLOSED: {
    code: 'WALLET_CLOSED',
    message: 'Wallet is closed and cannot be used',
    httpStatus: 403,
  },

  // Transaction Errors
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Insufficient balance for this transaction',
    httpStatus: 400,
  },
  DAILY_LIMIT_EXCEEDED: {
    code: 'DAILY_LIMIT_EXCEEDED',
    message: 'Daily transaction limit exceeded',
    httpStatus: 400,
  },
  WEEKLY_LIMIT_EXCEEDED: {
    code: 'WEEKLY_LIMIT_EXCEEDED',
    message: 'Weekly transaction limit exceeded',
    httpStatus: 400,
  },
  MONTHLY_LIMIT_EXCEEDED: {
    code: 'MONTHLY_LIMIT_EXCEEDED',
    message: 'Monthly transaction limit exceeded',
    httpStatus: 400,
  },
  TRANSACTION_LIMIT_EXCEEDED: {
    code: 'TRANSACTION_LIMIT_EXCEEDED',
    message: 'Single transaction limit exceeded',
    httpStatus: 400,
  },
  TRANSACTION_NOT_FOUND: {
    code: 'TRANSACTION_NOT_FOUND',
    message: 'Transaction not found',
    httpStatus: 404,
  },
  INVALID_TRANSACTION_STATUS: {
    code: 'INVALID_TRANSACTION_STATUS',
    message: 'Transaction status does not allow this operation',
    httpStatus: 400,
  },
  TRANSACTION_ALREADY_PROCESSED: {
    code: 'TRANSACTION_ALREADY_PROCESSED',
    message: 'Transaction has already been processed',
    httpStatus: 400,
  },
  TRANSACTION_CANCELLED: {
    code: 'TRANSACTION_CANCELLED',
    message: 'Transaction has been cancelled',
    httpStatus: 400,
  },
  INVALID_AMOUNT: {
    code: 'INVALID_AMOUNT',
    message: 'Transaction amount must be greater than zero',
    httpStatus: 400,
  },
  SAME_WALLET_TRANSFER: {
    code: 'SAME_WALLET_TRANSFER',
    message: 'Cannot transfer to the same wallet',
    httpStatus: 400,
  },

  // Payment Errors
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Payment processing failed',
    httpStatus: 400,
  },
  PAYMENT_DECLINED: {
    code: 'PAYMENT_DECLINED',
    message: 'Payment was declined',
    httpStatus: 400,
  },
  MERCHANT_NOT_FOUND: {
    code: 'MERCHANT_NOT_FOUND',
    message: 'Merchant not found',
    httpStatus: 404,
  },
  INVALID_PAYMENT_METHOD: {
    code: 'INVALID_PAYMENT_METHOD',
    message: 'Invalid payment method',
    httpStatus: 400,
  },

  // Validation Errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    httpStatus: 400,
  },
  INVALID_EMAIL_FORMAT: {
    code: 'INVALID_EMAIL_FORMAT',
    message: 'Invalid email format',
    httpStatus: 400,
  },
  INVALID_PHONE_FORMAT: {
    code: 'INVALID_PHONE_FORMAT',
    message: 'Invalid phone number format',
    httpStatus: 400,
  },
  PASSWORD_TOO_WEAK: {
    code: 'PASSWORD_TOO_WEAK',
    message: 'Password does not meet security requirements',
    httpStatus: 400,
  },

  // System Errors
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    httpStatus: 500,
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service is temporarily unavailable',
    httpStatus: 503,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    httpStatus: 500,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service error',
    httpStatus: 502,
  },

  // Rate Limiting
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
    httpStatus: 429,
  },
  TOO_MANY_LOGIN_ATTEMPTS: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts, account temporarily locked',
    httpStatus: 429,
  },

  // Device & Session Errors
  DEVICE_NOT_TRUSTED: {
    code: 'DEVICE_NOT_TRUSTED',
    message: 'Device is not trusted for this operation',
    httpStatus: 403,
  },
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'Session has expired',
    httpStatus: 401,
  },
  CONCURRENT_SESSION_LIMIT: {
    code: 'CONCURRENT_SESSION_LIMIT',
    message: 'Maximum number of concurrent sessions reached',
    httpStatus: 403,
  },

  // Verification Errors
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    message: 'Email address must be verified',
    httpStatus: 403,
  },
  PHONE_NOT_VERIFIED: {
    code: 'PHONE_NOT_VERIFIED',
    message: 'Phone number must be verified',
    httpStatus: 403,
  },
  TWO_FACTOR_REQUIRED: {
    code: 'TWO_FACTOR_REQUIRED',
    message: 'Two-factor authentication is required',
    httpStatus: 403,
  },
  INVALID_VERIFICATION_CODE: {
    code: 'INVALID_VERIFICATION_CODE',
    message: 'Invalid verification code',
    httpStatus: 400,
  },
} as const;

export type ErrorCode = keyof typeof ERROR_DICTIONARY;
