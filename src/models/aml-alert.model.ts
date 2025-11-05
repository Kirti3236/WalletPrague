import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Transaction } from './transaction.model';

export enum AlertType {
  VELOCITY = 'velocity',
  AMOUNT_THRESHOLD = 'amount_threshold',
  STRUCTURING = 'structuring',
  UNUSUAL_PATTERN = 'unusual_pattern',
  GEOGRAPHIC = 'geographic',
  HIGH_RISK_COUNTRY = 'high_risk_country',
  WATCHLIST = 'watchlist',
  PEP = 'pep',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated',
}

export enum ResolutionType {
  FALSE_POSITIVE = 'false_positive',
  LEGITIMATE = 'legitimate',
  SUSPICIOUS_REPORTED = 'suspicious_reported',
  ACCOUNT_BLOCKED = 'account_blocked',
}

@Table({
  tableName: 'yapague_aml_alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['severity'] },
    { fields: ['alert_type'] },
    { fields: ['created_at'] },
  ],
})
export class AMLAlert extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @ForeignKey(() => Transaction)
  @Column({ type: DataType.UUID, allowNull: true })
  transaction_id: string;

  @BelongsTo(() => Transaction, 'transaction_id')
  transaction: Transaction;

  @Column({ type: DataType.ENUM(...Object.values(AlertType)), allowNull: false })
  alert_type: AlertType;

  @Column({ type: DataType.ENUM(...Object.values(AlertSeverity)), allowNull: false })
  severity: AlertSeverity;

  @Column({ type: DataType.ENUM(...Object.values(AlertStatus)), allowNull: false, defaultValue: AlertStatus.PENDING })
  status: AlertStatus;

  @Column({ type: DataType.TEXT, allowNull: false })
  description: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata: Record<string, any>;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: true })
  triggered_amount: number;

  @Column({ type: DataType.STRING(3), allowNull: true })
  currency: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  risk_score: number;

  @Column({ type: DataType.DATE, allowNull: true })
  reviewed_at: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  reviewed_by: string;

  @BelongsTo(() => User, 'reviewed_by')
  reviewer: User;

  @Column({ type: DataType.TEXT, allowNull: true })
  review_notes: string;

  @Column({ type: DataType.DATE, allowNull: true })
  resolved_at: Date;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  resolved_by: string;

  @BelongsTo(() => User, 'resolved_by')
  resolver: User;

  @Column({ type: DataType.ENUM(...Object.values(ResolutionType)), allowNull: true })
  resolution_type: ResolutionType;

  @Column({ type: DataType.TEXT, allowNull: true })
  resolution_notes: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_escalated: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  escalated_at: Date;

  @Column({ type: DataType.STRING(255), allowNull: true })
  external_reference: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}

