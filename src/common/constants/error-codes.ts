/**
 * Standardized Error Codes for YaPague API
 * Following REST API best practices and financial industry standards
 */

export enum ErrorCode {
  // 4xx Client Errors

  // Authentication & Authorization (40xx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_UNAUTHORIZED = 'AUTH_004',
  AUTH_FORBIDDEN = 'AUTH_005',
  AUTH_SESSION_EXPIRED = 'AUTH_006',
  AUTH_MULTI_FACTOR_REQUIRED = 'AUTH_007',
  AUTH_ACCOUNT_LOCKED = 'AUTH_008',

  // User & Account (41xx)
  USER_NOT_FOUND = 'USER_001',
  USER_ALREADY_EXISTS = 'USER_002',
  USER_INACTIVE = 'USER_003',
  USER_SUSPENDED = 'USER_004',
  USER_ACCOUNT_RESTRICTED = 'USER_005',
  USER_VERIFICATION_REQUIRED = 'USER_006',
  USER_PROFILE_INCOMPLETE = 'USER_007',

  // Validation Errors (42xx)
  VALIDATION_FAILED = 'VAL_001',
  INVALID_EMAIL = 'VAL_002',
  INVALID_PHONE = 'VAL_003',
  INVALID_AMOUNT = 'VAL_004',
  INVALID_CURRENCY = 'VAL_005',
  INVALID_DATE = 'VAL_006',
  INVALID_UUID = 'VAL_007',
  MISSING_REQUIRED_FIELD = 'VAL_008',
  INVALID_ENUM_VALUE = 'VAL_009',
  INVALID_PASSWORD_STRENGTH = 'VAL_010',

  // Transaction Errors (43xx)
  INSUFFICIENT_BALANCE = 'TXN_001',
  DAILY_LIMIT_EXCEEDED = 'TXN_002',
  MONTHLY_LIMIT_EXCEEDED = 'TXN_003',
  TRANSACTION_LIMIT_EXCEEDED = 'TXN_004',
  DAILY_COUNT_EXCEEDED = 'TXN_005',
  MONTHLY_COUNT_EXCEEDED = 'TXN_006',
  TRANSFER_SAME_ACCOUNT = 'TXN_007',
  TRANSFER_NOT_FOUND = 'TXN_008',
  TRANSFER_ALREADY_COMPLETED = 'TXN_009',
  TRANSFER_CANCELLED = 'TXN_010',
  TRANSFER_TIMEOUT = 'TXN_011',
  RECEIVER_NOT_FOUND = 'TXN_012',
  RECEIVER_ACCOUNT_INVALID = 'TXN_013',

  // Wallet Errors (44xx)
  WALLET_NOT_FOUND = 'WALLET_001',
  WALLET_INACTIVE = 'WALLET_002',
  WALLET_FROZEN = 'WALLET_003',
  WALLET_LIMIT_REACHED = 'WALLET_004',

  // Deposit/Withdrawal Errors (45xx)
  DEPOSIT_FAILED = 'DEP_001',
  DEPOSIT_PENDING = 'DEP_002',
  DEPOSIT_NOT_FOUND = 'DEP_003',
  WITHDRAWAL_FAILED = 'WTH_001',
  WITHDRAWAL_PENDING = 'WTH_002',
  WITHDRAWAL_NOT_FOUND = 'WTH_003',
  WITHDRAWAL_LIMIT_EXCEEDED = 'WTH_004',
  INVALID_BANK_ACCOUNT = 'WTH_005',

  // Payment Method Errors (46xx)
  PAYMENT_METHOD_NOT_FOUND = 'PAY_001',
  PAYMENT_METHOD_EXPIRED = 'PAY_002',
  PAYMENT_METHOD_INACTIVE = 'PAY_003',
  PAYMENT_METHOD_VERIFICATION_REQUIRED = 'PAY_004',

  // Resource Errors (47xx)
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_ALREADY_EXISTS = 'RES_002',
  RESOURCE_CONFLICT = 'RES_003',
  RESOURCE_LOCKED = 'RES_004',

  // Compliance & Risk (48xx)
  COMPLIANCE_CHECK_FAILED = 'COMP_001',
  AML_ALERT_TRIGGERED = 'COMP_002',
  GEOFENCING_VIOLATION = 'COMP_003',
  DEVICE_VERIFICATION_REQUIRED = 'COMP_004',
  SUSPICIOUS_ACTIVITY_DETECTED = 'COMP_005',
  DAILY_VERIFICATION_LIMIT = 'COMP_006',
  RATE_LIMIT_EXCEEDED = 'COMP_007',

  // 5xx Server Errors

  // Internal Server Errors (50xx)
  INTERNAL_SERVER_ERROR = 'ERR_001',
  DATABASE_ERROR = 'ERR_002',
  TRANSACTION_FAILED = 'ERR_003',
  TIMEOUT_ERROR = 'ERR_004',
  SERVICE_UNAVAILABLE = 'ERR_005',
  EXTERNAL_SERVICE_ERROR = 'ERR_006',

  // Processing Errors (51xx)
  PROCESSING_FAILED = 'PROC_001',
  IDEMPOTENCY_CONFLICT = 'PROC_002',
  BATCH_PROCESSING_FAILED = 'PROC_003',
  RECONCILIATION_FAILED = 'PROC_004',
  SETTLEMENT_FAILED = 'PROC_005',
  ACCOUNTING_ERROR = 'PROC_006',

  // Integration Errors (52xx)
  BANK_INTEGRATION_ERROR = 'INT_001',
  PAYMENT_GATEWAY_ERROR = 'INT_002',
  EXTERNAL_API_ERROR = 'INT_003',
  WEBHOOK_DELIVERY_FAILED = 'INT_004',
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  traceId: string;
  path?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  errorCode?: ErrorCode;
}

export const ERROR_CODE_HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  // 4xx
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  [ErrorCode.AUTH_UNAUTHORIZED]: 401,
  [ErrorCode.AUTH_FORBIDDEN]: 403,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_MULTI_FACTOR_REQUIRED]: 403,
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 403,

  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_ALREADY_EXISTS]: 409,
  [ErrorCode.USER_INACTIVE]: 403,
  [ErrorCode.USER_SUSPENDED]: 403,
  [ErrorCode.USER_ACCOUNT_RESTRICTED]: 403,
  [ErrorCode.USER_VERIFICATION_REQUIRED]: 403,
  [ErrorCode.USER_PROFILE_INCOMPLETE]: 422,

  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.INVALID_PHONE]: 400,
  [ErrorCode.INVALID_AMOUNT]: 400,
  [ErrorCode.INVALID_CURRENCY]: 400,
  [ErrorCode.INVALID_DATE]: 400,
  [ErrorCode.INVALID_UUID]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_ENUM_VALUE]: 400,
  [ErrorCode.INVALID_PASSWORD_STRENGTH]: 400,

  [ErrorCode.INSUFFICIENT_BALANCE]: 422,
  [ErrorCode.DAILY_LIMIT_EXCEEDED]: 429,
  [ErrorCode.MONTHLY_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TRANSACTION_LIMIT_EXCEEDED]: 429,
  [ErrorCode.DAILY_COUNT_EXCEEDED]: 429,
  [ErrorCode.MONTHLY_COUNT_EXCEEDED]: 429,
  [ErrorCode.TRANSFER_SAME_ACCOUNT]: 400,
  [ErrorCode.TRANSFER_NOT_FOUND]: 404,
  [ErrorCode.TRANSFER_ALREADY_COMPLETED]: 409,
  [ErrorCode.TRANSFER_CANCELLED]: 409,
  [ErrorCode.TRANSFER_TIMEOUT]: 504,
  [ErrorCode.RECEIVER_NOT_FOUND]: 404,
  [ErrorCode.RECEIVER_ACCOUNT_INVALID]: 422,

  [ErrorCode.WALLET_NOT_FOUND]: 404,
  [ErrorCode.WALLET_INACTIVE]: 403,
  [ErrorCode.WALLET_FROZEN]: 403,
  [ErrorCode.WALLET_LIMIT_REACHED]: 429,

  [ErrorCode.DEPOSIT_FAILED]: 422,
  [ErrorCode.DEPOSIT_PENDING]: 409,
  [ErrorCode.DEPOSIT_NOT_FOUND]: 404,
  [ErrorCode.WITHDRAWAL_FAILED]: 422,
  [ErrorCode.WITHDRAWAL_PENDING]: 409,
  [ErrorCode.WITHDRAWAL_NOT_FOUND]: 404,
  [ErrorCode.WITHDRAWAL_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INVALID_BANK_ACCOUNT]: 422,

  [ErrorCode.PAYMENT_METHOD_NOT_FOUND]: 404,
  [ErrorCode.PAYMENT_METHOD_EXPIRED]: 422,
  [ErrorCode.PAYMENT_METHOD_INACTIVE]: 403,
  [ErrorCode.PAYMENT_METHOD_VERIFICATION_REQUIRED]: 403,

  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 423,

  [ErrorCode.COMPLIANCE_CHECK_FAILED]: 403,
  [ErrorCode.AML_ALERT_TRIGGERED]: 403,
  [ErrorCode.GEOFENCING_VIOLATION]: 403,
  [ErrorCode.DEVICE_VERIFICATION_REQUIRED]: 403,
  [ErrorCode.SUSPICIOUS_ACTIVITY_DETECTED]: 403,
  [ErrorCode.DAILY_VERIFICATION_LIMIT]: 429,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  // 5xx
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.TRANSACTION_FAILED]: 500,
  [ErrorCode.TIMEOUT_ERROR]: 504,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,

  [ErrorCode.PROCESSING_FAILED]: 500,
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 409,
  [ErrorCode.BATCH_PROCESSING_FAILED]: 500,
  [ErrorCode.RECONCILIATION_FAILED]: 500,
  [ErrorCode.SETTLEMENT_FAILED]: 500,
  [ErrorCode.ACCOUNTING_ERROR]: 500,

  [ErrorCode.BANK_INTEGRATION_ERROR]: 502,
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: 502,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.WEBHOOK_DELIVERY_FAILED]: 500,
};

export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid or malformed authentication token',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.AUTH_FORBIDDEN]: 'Access denied',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired',
  [ErrorCode.AUTH_MULTI_FACTOR_REQUIRED]: 'Multi-factor authentication required',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Account is locked',

  // User
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.USER_INACTIVE]: 'User account is inactive',
  [ErrorCode.USER_SUSPENDED]: 'User account is suspended',
  [ErrorCode.USER_ACCOUNT_RESTRICTED]: 'User account is restricted',
  [ErrorCode.USER_VERIFICATION_REQUIRED]: 'User verification required',
  [ErrorCode.USER_PROFILE_INCOMPLETE]: 'User profile is incomplete',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [ErrorCode.INVALID_PHONE]: 'Invalid phone number',
  [ErrorCode.INVALID_AMOUNT]: 'Invalid amount',
  [ErrorCode.INVALID_CURRENCY]: 'Invalid currency code',
  [ErrorCode.INVALID_DATE]: 'Invalid date format',
  [ErrorCode.INVALID_UUID]: 'Invalid UUID format',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_ENUM_VALUE]: 'Invalid enum value',
  [ErrorCode.INVALID_PASSWORD_STRENGTH]: 'Password does not meet strength requirements',

  // Transactions
  [ErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance',
  [ErrorCode.DAILY_LIMIT_EXCEEDED]: 'Daily transaction limit exceeded',
  [ErrorCode.MONTHLY_LIMIT_EXCEEDED]: 'Monthly transaction limit exceeded',
  [ErrorCode.TRANSACTION_LIMIT_EXCEEDED]: 'Transaction amount exceeds limit',
  [ErrorCode.DAILY_COUNT_EXCEEDED]: 'Daily transaction count limit exceeded',
  [ErrorCode.MONTHLY_COUNT_EXCEEDED]: 'Monthly transaction count limit exceeded',
  [ErrorCode.TRANSFER_SAME_ACCOUNT]: 'Cannot transfer to the same account',
  [ErrorCode.TRANSFER_NOT_FOUND]: 'Transfer not found',
  [ErrorCode.TRANSFER_ALREADY_COMPLETED]: 'Transfer already completed',
  [ErrorCode.TRANSFER_CANCELLED]: 'Transfer was cancelled',
  [ErrorCode.TRANSFER_TIMEOUT]: 'Transfer processing timeout',
  [ErrorCode.RECEIVER_NOT_FOUND]: 'Receiver not found',
  [ErrorCode.RECEIVER_ACCOUNT_INVALID]: 'Receiver account is invalid',

  // Wallet
  [ErrorCode.WALLET_NOT_FOUND]: 'Wallet not found',
  [ErrorCode.WALLET_INACTIVE]: 'Wallet is inactive',
  [ErrorCode.WALLET_FROZEN]: 'Wallet is frozen',
  [ErrorCode.WALLET_LIMIT_REACHED]: 'Wallet limit reached',

  // Deposits/Withdrawals
  [ErrorCode.DEPOSIT_FAILED]: 'Deposit processing failed',
  [ErrorCode.DEPOSIT_PENDING]: 'Deposit is pending',
  [ErrorCode.DEPOSIT_NOT_FOUND]: 'Deposit not found',
  [ErrorCode.WITHDRAWAL_FAILED]: 'Withdrawal processing failed',
  [ErrorCode.WITHDRAWAL_PENDING]: 'Withdrawal is pending',
  [ErrorCode.WITHDRAWAL_NOT_FOUND]: 'Withdrawal not found',
  [ErrorCode.WITHDRAWAL_LIMIT_EXCEEDED]: 'Withdrawal limit exceeded',
  [ErrorCode.INVALID_BANK_ACCOUNT]: 'Invalid bank account details',

  // Payment Methods
  [ErrorCode.PAYMENT_METHOD_NOT_FOUND]: 'Payment method not found',
  [ErrorCode.PAYMENT_METHOD_EXPIRED]: 'Payment method has expired',
  [ErrorCode.PAYMENT_METHOD_INACTIVE]: 'Payment method is inactive',
  [ErrorCode.PAYMENT_METHOD_VERIFICATION_REQUIRED]: 'Payment method verification required',

  // Resources
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ErrorCode.RESOURCE_CONFLICT]: 'Resource conflict',
  [ErrorCode.RESOURCE_LOCKED]: 'Resource is locked',

  // Compliance
  [ErrorCode.COMPLIANCE_CHECK_FAILED]: 'Compliance check failed',
  [ErrorCode.AML_ALERT_TRIGGERED]: 'Anti-Money Laundering alert triggered',
  [ErrorCode.GEOFENCING_VIOLATION]: 'Geographic restrictions violation',
  [ErrorCode.DEVICE_VERIFICATION_REQUIRED]: 'Device verification required',
  [ErrorCode.SUSPICIOUS_ACTIVITY_DETECTED]: 'Suspicious activity detected',
  [ErrorCode.DAILY_VERIFICATION_LIMIT]: 'Daily verification limit exceeded',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',

  // Server Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
  [ErrorCode.DATABASE_ERROR]: 'Database error',
  [ErrorCode.TRANSACTION_FAILED]: 'Transaction processing failed',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timeout',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',

  // Processing
  [ErrorCode.PROCESSING_FAILED]: 'Processing failed',
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 'Idempotency conflict',
  [ErrorCode.BATCH_PROCESSING_FAILED]: 'Batch processing failed',
  [ErrorCode.RECONCILIATION_FAILED]: 'Reconciliation failed',
  [ErrorCode.SETTLEMENT_FAILED]: 'Settlement failed',
  [ErrorCode.ACCOUNTING_ERROR]: 'Accounting error',

  // Integration
  [ErrorCode.BANK_INTEGRATION_ERROR]: 'Bank integration error',
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: 'Payment gateway error',
  [ErrorCode.EXTERNAL_API_ERROR]: 'External API error',
  [ErrorCode.WEBHOOK_DELIVERY_FAILED]: 'Webhook delivery failed',
};
