import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessErrorDetails {
  code: string;
  message: string;
  details?: any;
}

export class BusinessException extends HttpException {
  constructor(
    error: BusinessErrorDetails,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      status,
    );
  }
}

// Specific business exceptions
export class InsufficientBalanceException extends BusinessException {
  constructor(availableBalance: number, requestedAmount: number) {
    super(
      {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance for this transaction',
        details: {
          availableBalance,
          requestedAmount,
          shortfall: requestedAmount - availableBalance,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DailyLimitExceededException extends BusinessException {
  constructor(dailyLimit: number, usedAmount: number, requestedAmount: number) {
    super(
      {
        code: 'DAILY_LIMIT_EXCEEDED',
        message: 'Daily transaction limit exceeded',
        details: {
          dailyLimit,
          usedAmount,
          requestedAmount,
          remainingLimit: dailyLimit - usedAmount,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AccountSuspendedException extends BusinessException {
  constructor(reason?: string) {
    super(
      {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended and cannot perform transactions',
        details: { reason },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class TransactionNotFoundException extends BusinessException {
  constructor(transactionId: string) {
    super(
      {
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found',
        details: { transactionId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidTransactionStatusException extends BusinessException {
  constructor(currentStatus: string, requiredStatus: string) {
    super(
      {
        code: 'INVALID_TRANSACTION_STATUS',
        message: 'Transaction status does not allow this operation',
        details: { currentStatus, requiredStatus },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class WalletNotFoundException extends BusinessException {
  constructor(walletId: string) {
    super(
      {
        code: 'WALLET_NOT_FOUND',
        message: 'Wallet not found',
        details: { walletId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class AccountNotFoundException extends BusinessException {
  constructor(accountId: string) {
    super(
      {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account not found',
        details: { accountId },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
