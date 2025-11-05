import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Transaction } from './transaction.model';

// ✅ PHASE 3: Refund status enum
export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ✅ PHASE 3: Refund reason enum
export enum RefundReason {
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  INCORRECT_AMOUNT = 'incorrect_amount',
  UNAUTHORIZED_TRANSACTION = 'unauthorized_transaction',
  MERCHANT_ERROR = 'merchant_error',
  CUSTOMER_REQUEST = 'customer_request',
  CANCELLED_ORDER = 'cancelled_order',
  TECHNICAL_ERROR = 'technical_error',
  OTHER = 'other',
}

@Table({
  tableName: 'yapague_refund_requests',
  timestamps: true,
  indexes: [
    // Index for filtering by user
    { fields: ['user_id'] },
    // Index for filtering by status
    { fields: ['status'] },
    // Index for filtering by transaction
    { fields: ['transaction_id'] },
    // Composite index for list queries
    { fields: ['user_id', 'status'] },
    // Index for requested_at (for timeline queries)
    { fields: ['requested_at'] },
  ],
})
export class RefundRequest extends Model<RefundRequest> {
  // ✅ Primary Key
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  // ✅ Foreign Keys
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'User requesting the refund',
  })
  user_id: string;

  @ForeignKey(() => Transaction)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Original transaction to refund',
  })
  transaction_id: string;

  // ✅ Refund Details
  @Column({
    type: DataType.DECIMAL(18, 2),
    allowNull: false,
    comment: 'Original transaction amount',
  })
  requested_amount: number;

  @Column({
    type: DataType.DECIMAL(18, 2),
    allowNull: false,
    comment: 'Actual refund amount (can be partial)',
  })
  refund_amount: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'LPS',
    comment: 'Currency code (e.g., LPS, USD)',
  })
  currency: string;

  // ✅ Refund Reason & Description
  @Column({
    type: DataType.ENUM(...Object.values(RefundReason)),
    allowNull: false,
  })
  reason: RefundReason;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Customer description/notes',
  })
  description: string;

  // ✅ Status & Tracking
  @Column({
    type: DataType.ENUM(...Object.values(RefundStatus)),
    allowNull: false,
    defaultValue: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    comment: 'When refund was requested',
  })
  requested_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When refund was approved',
  })
  approved_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When refund was rejected',
  })
  rejected_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When refund was completed (funds returned)',
  })
  completed_at: Date;

  // ✅ Admin Notes
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Admin notes on approval/rejection',
  })
  admin_notes: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Reason for rejection (if rejected)',
  })
  rejection_reason: string;

  // ✅ Audit Trail
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'ID of reversing journal entry (if refund completed)',
  })
  reversing_journal_entry_id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Admin user ID who approved/rejected',
  })
  processed_by: string;

  // ✅ Timestamps
  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
