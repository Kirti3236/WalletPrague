import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.model';

export enum StatementFileFormat {
  CSV = 'csv',
  JSON = 'json',
  OFX = 'ofx',
  MT940 = 'mt940',
}

export enum StatementStatus {
  PENDING_IMPORT = 'pending_import',
  IMPORTED = 'imported',
  PROCESSING = 'processing',
  MATCHED = 'matched',
  RECONCILED = 'reconciled',
  FAILED = 'failed',
}

@Table({
  tableName: 'yapague_bank_statements',
  timestamps: true,
})
export class BankStatement extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string;

  @BelongsTo(() => User)
  user: User;

  // Bank details
  @Column({ type: DataType.STRING(255), allowNull: false })
  bank_name: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  account_number: string;

  @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: 'INR' })
  currency: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  opening_balance: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  closing_balance: number;

  // Statement period
  @Column({ type: DataType.DATEONLY, allowNull: false })
  statement_start_date: Date;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  statement_end_date: Date;

  // File metadata
  @Column({ type: DataType.STRING(255), allowNull: true })
  file_name: string;

  @Column({ type: DataType.ENUM(...Object.values(StatementFileFormat)), allowNull: false })
  file_format: StatementFileFormat;

  @Column({ type: DataType.BIGINT, allowNull: true })
  file_size_bytes: number;

  // Processing status
  @Column({
    type: DataType.ENUM(...Object.values(StatementStatus)),
    allowNull: false,
    defaultValue: StatementStatus.PENDING_IMPORT,
  })
  status: StatementStatus;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  total_transactions: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  matched_transactions: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  unmatched_transactions: number;

  // Reconciliation tracking
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_fully_reconciled: boolean;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  reconciliation_variance: number; // difference if any

  @Column({ type: DataType.DATE, allowNull: true })
  reconciled_at: Date;

  // Processing metadata
  @Column({ type: DataType.JSONB, allowNull: true })
  import_errors: Record<string, any>[]; // array of validation errors

  @Column({ type: DataType.JSONB, allowNull: true })
  metadata: Record<string, any>; // additional import metadata

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.UUID, allowNull: true })
  imported_by: string; // user who imported

  @Column({ type: DataType.DATE, allowNull: true })
  imported_at: Date;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  // Note: Indexes should be created in database migrations
}

/**
 * BankStatementLine - Individual transaction from bank statement
 */
@Table({
  tableName: 'yapague_bank_statement_lines',
  timestamps: true,
  indexes: [
    { fields: ['statement_id'] },
    { fields: ['is_matched'] },
    { fields: ['transaction_date'] },
  ],
})
export class BankStatementLine extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  })
  declare id: string;

  @ForeignKey(() => BankStatement)
  @Column({ type: DataType.UUID, allowNull: false })
  statement_id: string;

  @BelongsTo(() => BankStatement)
  statement: BankStatement;

  // Transaction details
  @Column({ type: DataType.INTEGER, allowNull: false })
  line_number: number; // sequence in statement

  @Column({ type: DataType.DATEONLY, allowNull: false })
  transaction_date: Date;

  @Column({ type: DataType.STRING(100), allowNull: true })
  reference_number: string; // bank's reference

  @Column({ type: DataType.STRING(255), allowNull: true })
  description: string; // bank provided description

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  amount: number;

  @Column({
    type: DataType.ENUM('debit', 'credit'),
    allowNull: false,
  })
  transaction_type: 'debit' | 'credit';

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  running_balance: number; // balance after this transaction

  @Column({ type: DataType.JSONB, allowNull: true })
  extra_fields: Record<string, any>; // any extra data from statement

  // Matching & Reconciliation
  @Column({ type: DataType.UUID, allowNull: true })
  matched_internal_transaction_id: string; // FK to internal transaction

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_matched: boolean;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  match_confidence_percent: number; // confidence of match (0-100)

  @Column({ type: DataType.STRING(50), allowNull: true })
  match_reason: string; // how match was determined (amount, ref, date, etc)

  @Column({ type: DataType.DATE, allowNull: true })
  matched_at: Date;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_reconciled: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  reconciled_at: Date;

  // Variance tracking
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  has_variance: boolean; // differs from expected

  @Column({ type: DataType.TEXT, allowNull: true })
  variance_reason: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}

/**
 * StatementReconciliation - Tracks reconciliation process
 */
@Table({
  tableName: 'yapague_statement_reconciliations',
  timestamps: true,
})
export class StatementReconciliation extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  })
  declare id: string;

  @ForeignKey(() => BankStatement)
  @Column({ type: DataType.UUID, allowNull: false })
  statement_id: string;

  @BelongsTo(() => BankStatement)
  statement: BankStatement;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  reconciled_by: string;

  @BelongsTo(() => User, 'reconciled_by')
  reconciler: User;

  // Reconciliation details
  @Column({
    type: DataType.ENUM('pending', 'in_progress', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column({ type: DataType.INTEGER, allowNull: false })
  total_lines: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  matched_lines: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  unmatched_lines: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  statement_closing_balance: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  system_balance: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: false })
  variance: number; // statement balance - system balance

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_balanced: boolean;

  // Algorithm & strategy used
  @Column({ type: DataType.STRING(50), allowNull: false })
  matching_algorithm: string; // 'exact_amount', 'fuzzy_match', 'manual', etc

  @Column({ type: DataType.INTEGER, allowNull: true })
  processing_time_ms: number; // how long reconciliation took

  @Column({ type: DataType.JSONB, allowNull: true })
  unmatched_details: Record<string, any>[]; // lines that couldn't be matched

  @Column({ type: DataType.TEXT, allowNull: true })
  notes: string;

  @Column({ type: DataType.DATE, allowNull: true })
  completed_at: Date;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  // Note: Indexes should be created in database migrations
}
