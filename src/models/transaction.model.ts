import {
  Table,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  Index,
  BeforeValidate,
  BelongsTo,
  BeforeUpdate,
  AfterSave,
} from 'sequelize-typescript';
import { Wallet } from './wallet.model';
import { User } from './user.model';
import { TxnStatus } from './txn-status.model';
import { QrCode } from './qr-code.model';
import { writeAudit } from '../common/utils/audit.util';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  P2P_PAYMENT = 'p2p_payment',
  QR_PAYMENT = 'qr_payment',
  FEE = 'fee',
  REFUND = 'refund',
}

// status is now catalog-based via FK to yapague_txn_statuses

export enum PaymentMethodKind {
  WALLET = 'wallet',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  QR_CODE = 'qr_code',
}

@Table({
  tableName: 'yapague_transactions',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['type', 'status'] },
    { fields: ['processed_at'] },
    { fields: ['sender_wallet_id'] },
    { fields: ['receiver_wallet_id'] },
  ],
})
export class Transaction extends Model<Transaction> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(true)
  @Index
  @Column({ type: DataType.STRING(255) })
  declare request_id?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20) })
  declare transaction_code?: string;

  @ForeignKey(() => Wallet)
  @Index
  @Column({ type: DataType.UUID, allowNull: true })
  declare sender_wallet_id?: string | null;

  @ForeignKey(() => Wallet)
  @Index
  @Column({ type: DataType.UUID, allowNull: true })
  declare receiver_wallet_id?: string | null;

  @ForeignKey(() => User)
  @Index
  @Column({ type: DataType.UUID, allowNull: true })
  declare sender_user_id?: string | null;

  @ForeignKey(() => User)
  @Index
  @Column({ type: DataType.UUID, allowNull: true })
  declare receiver_user_id?: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20) })
  declare receiver_dni?: string;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(TransactionType)) })
  declare type: TransactionType;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2), validate: { min: 0.01 } })
  declare amount: string;

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(false)
  @Default('0.00')
  @Column({ type: DataType.DECIMAL(18, 2), validate: { min: 0 } })
  declare fee_amount: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare net_amount: string;

  @ForeignKey(() => TxnStatus)
  @AllowNull(false)
  @Index
  @Column({ type: DataType.STRING(32) })
  declare status: string;

  @BelongsTo(() => TxnStatus, {
    foreignKey: 'status',
    targetKey: 'code',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare statusRef?: TxnStatus;

  @AllowNull(true)
  @Column({ type: DataType.ENUM(...Object.values(PaymentMethodKind)) })
  declare payment_method?: PaymentMethodKind;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500) })
  declare description?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255) })
  declare gateway_reference?: string;

  @AllowNull(true)
  @Column({ type: DataType.JSONB })
  declare gateway_response?: unknown;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare processed_at?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare expires_at?: Date | null;

  @ForeignKey(() => QrCode)
  @AllowNull(true)
  @Index
  @Column({ type: DataType.UUID })
  declare qr_code_id?: string | null;

  @BelongsTo(() => QrCode, {
    foreignKey: 'qr_code_id',
    onDelete: 'SET NULL',
    onUpdate: 'RESTRICT',
  })
  declare qrCode?: QrCode | null;

  // User associations
  @BelongsTo(() => User, {
    foreignKey: 'sender_user_id',
    as: 'senderUser',
    onDelete: 'SET NULL',
    onUpdate: 'RESTRICT',
  })
  declare senderUser?: User | null;

  @BelongsTo(() => User, {
    foreignKey: 'receiver_user_id',
    as: 'receiverUser',
    onDelete: 'SET NULL',
    onUpdate: 'RESTRICT',
  })
  declare receiverUser?: User | null;

  // Wallet associations
  @BelongsTo(() => Wallet, {
    foreignKey: 'sender_wallet_id',
    as: 'senderWallet',
  })
  declare senderWallet?: Wallet | null;

  @BelongsTo(() => Wallet, {
    foreignKey: 'receiver_wallet_id',
    as: 'receiverWallet',
  })
  declare receiverWallet?: Wallet | null;

  @BeforeValidate
  static enforceBusinessRules(instance: Transaction) {
    const amountNum = parseFloat((instance.amount as unknown as string) || '0');
    const feeNum = parseFloat(
      (instance.fee_amount as unknown as string) || '0',
    );
    instance.net_amount = (amountNum - feeNum).toFixed(2) as unknown as string;

    // processed_at required when status = completed
    if (instance.status === 'completed' && !instance.processed_at) {
      instance.processed_at = new Date();
    }

    // Type-specific integrity
    const hasSender = !!instance.sender_wallet_id;
    const hasReceiver = !!instance.receiver_wallet_id;
    if (
      instance.type === TransactionType.DEPOSIT ||
      instance.type === TransactionType.WITHDRAWAL
    ) {
      // exactly one side present
      if (hasSender === hasReceiver) {
        throw new Error('invalid_parties_for_deposit_withdrawal');
      }
    }
    if (
      instance.type === TransactionType.P2P_PAYMENT ||
      instance.type === TransactionType.QR_PAYMENT
    ) {
      if (!hasSender || !hasReceiver) {
        throw new Error('both_parties_required_for_p2p_qr');
      }
    }
  }

  @BeforeUpdate
  static touch(instance: Transaction) {
    (instance as any).updated_at = new Date();
  }

  @AfterSave
  static logAudit(instance: Transaction, _options: any) {
    const { id, type, status, amount, currency } = instance as any;
    void writeAudit('transaction', id, 'update', null, {
      type,
      status,
      amount,
      currency,
    });
  }
}
