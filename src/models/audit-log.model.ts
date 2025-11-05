import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

export enum AuditAction {
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTRATION = 'user_registration',
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_PASSWORD_CHANGE = 'user_password_change',

  // Transaction actions
  TRANSFER_INITIATED = 'transfer_initiated',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_FAILED = 'transfer_failed',
  TRANSFER_REVERSED = 'transfer_reversed',
  DEPOSIT_INITIATED = 'deposit_initiated',
  DEPOSIT_COMPLETED = 'deposit_completed',
  DEPOSIT_FAILED = 'deposit_failed',
  WITHDRAWAL_INITIATED = 'withdrawal_initiated',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_FAILED = 'withdrawal_failed',
  
  // Refund actions
  REFUND_REQUESTED = 'refund_requested',
  REFUND_APPROVED = 'refund_approved',
  REFUND_REJECTED = 'refund_rejected',
  REFUND_COMPLETED = 'refund_completed',

  // Admin actions
  ADMIN_CREATE_POLICY = 'admin_create_policy',
  ADMIN_UPDATE_POLICY = 'admin_update_policy',
  ADMIN_DELETE_POLICY = 'admin_delete_policy',
  ADMIN_ASSIGN_LIMIT = 'admin_assign_limit',
  ADMIN_SUSPEND_USER = 'admin_suspend_user',
  ADMIN_UNSUSPEND_USER = 'admin_unsuspend_user',

  // System actions
  SYSTEM_RECONCILIATION = 'system_reconciliation',
  SYSTEM_SETTLEMENT = 'system_settlement',
  SYSTEM_BATCH_PROCESS = 'system_batch_process',
}

@Table({
  tableName: 'yapague_audit_logs',
  timestamps: true,
  underscored: true,
})
export class AuditLog extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Immutable sequence number for chain integrity',
  })
  declare sequence_number: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who performed the action',
  })
  declare user_id: string;

  @BelongsTo(() => User, 'user_id')
  declare user: User;

  @Column({
    type: DataType.ENUM(...Object.values(AuditAction)),
    allowNull: false,
  })
  declare action: AuditAction;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    comment: 'Resource type affected (user, transaction, transfer, etc)',
  })
  declare resource_type: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'ID of the resource being affected',
  })
  declare resource_id: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Before state of the resource (for updates)',
  })
  declare before_state: Record<string, any>;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'After state of the resource',
  })
  declare after_state: Record<string, any>;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    comment: 'Reason or description of the action',
  })
  declare reason: string;

  @Column({
    type: DataType.STRING(15),
    allowNull: true,
    comment: 'Client IP address',
  })
  declare ip_address: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'User agent string',
  })
  declare user_agent: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Hash of this log entry (SHA-256)',
  })
  declare entry_hash: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Hash of previous entry (creates chain)',
  })
  declare previous_hash: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is hash chain valid (integrity check)',
  })
  declare hash_chain_valid: boolean;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    defaultValue: 'success',
    comment: 'Result of action: success, failure, partial',
  })
  declare status: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Error message if action failed',
  })
  declare error_message: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Response time in milliseconds',
  })
  declare response_time_ms: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Amount involved (for financial transactions)',
  })
  declare amount: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    comment: 'Currency code (HNL, USD, etc)',
  })
  declare currency: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is this a compliance-relevant action',
  })
  declare is_compliance_relevant: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare updated_at: Date;
}

// Note: Indexes should be created in database migrations for better control
// See database migrations for index definitions
