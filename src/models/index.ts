export { User, UserStatus, UserRole } from './user.model';

// Export all models as an array for Sequelize initialization
import { User } from './user.model';
import { Wallet } from './wallet.model';
import { Transaction } from './transaction.model';
import { Ledger } from './ledger.model';
import { PaymentMethod } from './payment-method.model';
import { QrCode } from './qr-code.model';
import { TransactionCode } from './transaction-code.model';
import { Fee } from './fee.model';
import { Dispute } from './dispute.model';
import { Settlement } from './settlement.model';
import { AuditLog } from './audit-log.model';
import { Webhook } from './webhook.model';
import { Currency } from './currency.model';
import { BankLocation } from './bank-location.model';
import { TxnStatus } from './txn-status.model';
import { DisputeStatusCatalog } from './dispute-status.model';
import { FeePolicy } from './fee-policy.model';
import { AMLAlert } from './aml-alert.model';
import { BankStatement, BankStatementLine } from './bank-statement.model';
import { ChartOfAccounts } from './chart-of-accounts.model';
import { GeneralLedger } from './general-ledger.model';
import { IdempotencyKey } from './idempotency-key.model';
import { Journal } from './journal.model';
import { JournalEntry } from './journal-entry.model';
import { LimitCounterDaily } from './limit-counter-daily.model';
import { LimitCounterMonthly } from './limit-counter-monthly.model';
import { LimitPolicy } from './limit-policy.model';
import { RefundRequest } from './refund-request.model';
import { Restriction } from './restriction.model';
import { UserLimit } from './user-limit.model';

export const models = [
  User,
  Wallet,
  Transaction,
  Ledger,
  PaymentMethod,
  QrCode,
  TransactionCode,
  Fee,
  Dispute,
  Settlement,
  AuditLog,
  Webhook,
  Currency,
  BankLocation,
  TxnStatus,
  DisputeStatusCatalog,
  FeePolicy,
  AMLAlert,
  BankStatement,
  BankStatementLine,
  ChartOfAccounts,
  GeneralLedger,
  IdempotencyKey,
  Journal,
  JournalEntry,
  LimitCounterDaily,
  LimitCounterMonthly,
  LimitPolicy,
  RefundRequest,
  Restriction,
  UserLimit,
];
