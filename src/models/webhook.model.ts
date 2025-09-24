import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull, Index } from 'sequelize-typescript';

export enum WebhookEvent {
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  USER_ACCOUNT_SUSPENDED = 'user.account_suspended',
  DISPUTE_CREATED = 'dispute.created',
  WITHDRAWAL_CODE_GENERATED = 'withdrawal.code_generated',
}

export enum WebhookStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Table({
  tableName: 'yapague_webhooks',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Webhook extends Model<Webhook> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(500) })
  declare url: string;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(WebhookEvent)) })
  declare event_type: WebhookEvent;

  @AllowNull(false)
  @Column({ type: DataType.JSONB })
  declare payload: unknown;

  @AllowNull(false)
  @Default(WebhookStatus.PENDING)
  @Column({ type: DataType.ENUM(...Object.values(WebhookStatus)) })
  declare status: WebhookStatus;

  @AllowNull(false)
  @Default(0)
  @Column({ type: DataType.INTEGER })
  declare attempts: number;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare last_attempt_at?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare next_retry_at?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER })
  declare response_code?: number | null;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare response_body?: string | null;
}
