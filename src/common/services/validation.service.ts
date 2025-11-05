import { Injectable } from '@nestjs/common';
import {
  ValidationException,
  TransactionException,
} from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

/**
 * Validation Service
 * Provides centralized validation logic for common data types
 */
@Injectable()
export class ValidationService {
  /**
   * Validate email format
   */
  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      throw new ValidationException('Invalid email address', [
        {
          field: 'email',
          message: 'Must be a valid email address',
          errorCode: ErrorCode.INVALID_EMAIL,
        },
      ]);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhone(phone: string): void {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

    if (!phone || !phoneRegex.test(phone.replace(/\s/g, ''))) {
      throw new ValidationException('Invalid phone number', [
        {
          field: 'phone',
          message: 'Must be a valid phone number',
          errorCode: ErrorCode.INVALID_PHONE,
        },
      ]);
    }
  }

  /**
   * Validate decimal amount (non-negative, max 2 decimal places)
   */
  validateAmount(amount: number, fieldName: string = 'amount'): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ValidationException('Invalid amount format', [
        {
          field: fieldName,
          message: 'Must be a valid number',
          errorCode: ErrorCode.INVALID_AMOUNT,
        },
      ]);
    }

    if (amount < 0) {
      throw new ValidationException('Amount must be positive', [
        {
          field: fieldName,
          message: 'Amount cannot be negative',
          errorCode: ErrorCode.INVALID_AMOUNT,
        },
      ]);
    }

    // Check decimal places (max 2 for currency)
    if (!Number.isInteger(amount * 100)) {
      throw new ValidationException('Invalid decimal places', [
        {
          field: fieldName,
          message: 'Amount cannot have more than 2 decimal places',
          errorCode: ErrorCode.INVALID_AMOUNT,
        },
      ]);
    }
  }

  /**
   * Validate amount is within min/max range
   */
  validateAmountRange(
    amount: number,
    minAmount?: number,
    maxAmount?: number,
    fieldName: string = 'amount',
  ): void {
    this.validateAmount(amount, fieldName);

    if (minAmount !== undefined && amount < minAmount) {
      throw new ValidationException(
        `Amount must be at least ${minAmount}`,
        [
          {
            field: fieldName,
            message: `Minimum amount is ${minAmount}`,
            errorCode: ErrorCode.INVALID_AMOUNT,
          },
        ],
      );
    }

    if (maxAmount !== undefined && amount > maxAmount) {
      throw new ValidationException(
        `Amount cannot exceed ${maxAmount}`,
        [
          {
            field: fieldName,
            message: `Maximum amount is ${maxAmount}`,
            errorCode: ErrorCode.INVALID_AMOUNT,
          },
        ],
      );
    }
  }

  /**
   * Validate currency code (ISO 4217 format)
   */
  validateCurrency(currency: string): void {
    const currencyRegex = /^[A-Z]{3}$/;

    if (!currency || !currencyRegex.test(currency)) {
      throw new ValidationException('Invalid currency code', [
        {
          field: 'currency',
          message: 'Currency must be 3-letter ISO code (e.g., USD, EUR, INR)',
          errorCode: ErrorCode.INVALID_CURRENCY,
        },
      ]);
    }
  }

  /**
   * Validate ISO date string
   */
  validateDate(dateString: string, fieldName: string = 'date'): Date {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new ValidationException('Invalid date format', [
        {
          field: fieldName,
          message: 'Must be a valid ISO 8601 date',
          errorCode: ErrorCode.INVALID_DATE,
        },
      ]);
    }

    return date;
  }

  /**
   * Validate date is not in the past
   */
  validateFutureDate(
    dateString: string,
    fieldName: string = 'date',
  ): Date {
    const date = this.validateDate(dateString, fieldName);
    const now = new Date();

    if (date < now) {
      throw new ValidationException('Date cannot be in the past', [
        {
          field: fieldName,
          message: 'Date must be in the future',
          errorCode: ErrorCode.INVALID_DATE,
        },
      ]);
    }

    return date;
  }

  /**
   * Validate date is not in the future
   */
  validatePastDate(dateString: string, fieldName: string = 'date'): Date {
    const date = this.validateDate(dateString, fieldName);
    const now = new Date();

    if (date > now) {
      throw new ValidationException('Date cannot be in the future', [
        {
          field: fieldName,
          message: 'Date must be in the past',
          errorCode: ErrorCode.INVALID_DATE,
        },
      ]);
    }

    return date;
  }

  /**
   * Validate date range
   */
  validateDateRange(
    startDate: string,
    endDate: string,
  ): { startDate: Date; endDate: Date } {
    const start = this.validateDate(startDate, 'startDate');
    const end = this.validateDate(endDate, 'endDate');

    if (start > end) {
      throw new ValidationException('Invalid date range', [
        {
          field: 'dateRange',
          message: 'Start date must be before end date',
          errorCode: ErrorCode.INVALID_DATE,
        },
      ]);
    }

    return { startDate: start, endDate: end };
  }

  /**
   * Validate UUID v4 format
   */
  validateUUID(uuid: string, fieldName: string = 'id'): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      throw new ValidationException('Invalid UUID format', [
        {
          field: fieldName,
          message: 'Must be a valid UUID v4',
          errorCode: ErrorCode.INVALID_UUID,
        },
      ]);
    }
  }

  /**
   * Validate password strength
   * Requirements: min 8 chars, uppercase, lowercase, number, special char
   */
  validatePasswordStrength(password: string): void {
    if (!password || password.length < 8) {
      throw new ValidationException('Password too short', [
        {
          field: 'password',
          message: 'Password must be at least 8 characters',
          errorCode: ErrorCode.INVALID_PASSWORD_STRENGTH,
        },
      ]);
    }

    if (!/[A-Z]/.test(password)) {
      throw new ValidationException('Password missing uppercase', [
        {
          field: 'password',
          message: 'Password must contain at least one uppercase letter',
          errorCode: ErrorCode.INVALID_PASSWORD_STRENGTH,
        },
      ]);
    }

    if (!/[a-z]/.test(password)) {
      throw new ValidationException('Password missing lowercase', [
        {
          field: 'password',
          message: 'Password must contain at least one lowercase letter',
          errorCode: ErrorCode.INVALID_PASSWORD_STRENGTH,
        },
      ]);
    }

    if (!/[0-9]/.test(password)) {
      throw new ValidationException('Password missing number', [
        {
          field: 'password',
          message: 'Password must contain at least one number',
          errorCode: ErrorCode.INVALID_PASSWORD_STRENGTH,
        },
      ]);
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new ValidationException('Password missing special character', [
        {
          field: 'password',
          message: 'Password must contain at least one special character',
          errorCode: ErrorCode.INVALID_PASSWORD_STRENGTH,
        },
      ]);
    }
  }

  /**
   * Validate required field is present and not empty
   */
  validateRequired(
    value: any,
    fieldName: string,
  ): void {
    if (value === null || value === undefined || value === '') {
      throw new ValidationException('Missing required field', [
        {
          field: fieldName,
          message: `${fieldName} is required`,
          errorCode: ErrorCode.MISSING_REQUIRED_FIELD,
        },
      ]);
    }
  }

  /**
   * Validate enum value
   */
  validateEnum<T>(
    value: any,
    enumObject: Record<string, T>,
    fieldName: string,
  ): void {
    const validValues = Object.values(enumObject);

    if (!validValues.includes(value as T)) {
      throw new ValidationException('Invalid enum value', [
        {
          field: fieldName,
          message: `Must be one of: ${validValues.join(', ')}`,
          errorCode: ErrorCode.INVALID_ENUM_VALUE,
        },
      ]);
    }
  }

  /**
   * Validate string length
   */
  validateStringLength(
    value: string,
    minLength?: number,
    maxLength?: number,
    fieldName: string = 'value',
  ): void {
    if (minLength !== undefined && value.length < minLength) {
      throw new ValidationException(
        `${fieldName} too short`,
        [
          {
            field: fieldName,
            message: `Minimum length is ${minLength} characters`,
            errorCode: ErrorCode.VALIDATION_FAILED,
          },
        ],
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw new ValidationException(
        `${fieldName} too long`,
        [
          {
            field: fieldName,
            message: `Maximum length is ${maxLength} characters`,
            errorCode: ErrorCode.VALIDATION_FAILED,
          },
        ],
      );
    }
  }

  /**
   * Validate array not empty
   */
  validateArrayNotEmpty(value: any[], fieldName: string = 'array'): void {
    if (!Array.isArray(value) || value.length === 0) {
      throw new ValidationException('Array cannot be empty', [
        {
          field: fieldName,
          message: `${fieldName} must contain at least one item`,
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
      ]);
    }
  }

  /**
   * Validate array length
   */
  validateArrayLength(
    value: any[],
    minLength?: number,
    maxLength?: number,
    fieldName: string = 'array',
  ): void {
    if (!Array.isArray(value)) {
      throw new ValidationException('Must be an array', [
        {
          field: fieldName,
          message: `${fieldName} must be an array`,
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
      ]);
    }

    if (minLength !== undefined && value.length < minLength) {
      throw new ValidationException(
        `${fieldName} has too few items`,
        [
          {
            field: fieldName,
            message: `Minimum items required: ${minLength}`,
            errorCode: ErrorCode.VALIDATION_FAILED,
          },
        ],
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw new ValidationException(
        `${fieldName} has too many items`,
        [
          {
            field: fieldName,
            message: `Maximum items allowed: ${maxLength}`,
            errorCode: ErrorCode.VALIDATION_FAILED,
          },
        ],
      );
    }
  }

  /**
   * Validate bank account number (basic check)
   */
  validateBankAccount(accountNumber: string): void {
    // Remove spaces and dashes
    const cleaned = accountNumber.replace(/[\s-]/g, '');

    // Basic: 8-17 digits
    if (!/^\d{8,17}$/.test(cleaned)) {
      throw new ValidationException('Invalid bank account number', [
        {
          field: 'accountNumber',
          message: 'Account number must be 8-17 digits',
          errorCode: ErrorCode.INVALID_ENUM_VALUE,
        },
      ]);
    }
  }

  /**
   * Validate IFSC code (Indian bank code format)
   */
  validateIFSC(ifsc: string): void {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(ifsc)) {
      throw new ValidationException('Invalid IFSC code', [
        {
          field: 'ifsc',
          message: 'IFSC must be 11 characters (format: ABCD0123456)',
          errorCode: ErrorCode.INVALID_ENUM_VALUE,
        },
      ]);
    }
  }
}
