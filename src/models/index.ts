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
];
