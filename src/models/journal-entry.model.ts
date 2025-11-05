import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

export enum EntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

@Table({
  tableName: 'yapague_journal_entries',
  timestamps: true,
  underscored: true,
})
export class JournalEntry extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => require('./journal.model').Journal)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to journal',
  })
  journal_id: string;

  @BelongsTo(() => require('./journal.model').Journal, 'journal_id')
  journal: any;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
  })
  entry_number: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Date of the journal entry',
  })
  entry_date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Description of the transaction',
  })
  description: string;

  @ForeignKey(() => require('./chart-of-accounts.model').ChartOfAccounts)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Debit account',
  })
  debit_account_id: string;

  @BelongsTo(() => require('./chart-of-accounts.model').ChartOfAccounts, 'debit_account_id')
  debit_account: any;

  @ForeignKey(() => require('./chart-of-accounts.model').ChartOfAccounts)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Credit account',
  })
  credit_account_id: string;

  @BelongsTo(() => require('./chart-of-accounts.model').ChartOfAccounts, 'credit_account_id')
  credit_account: any;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Transaction amount',
  })
  amount: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
    defaultValue: 'HNL',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    type: DataType.ENUM(...Object.values(EntryStatus)),
    allowNull: false,
    defaultValue: EntryStatus.POSTED,
  })
  status: EntryStatus;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Related transaction ID',
  })
  transaction_id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Transaction type (transfer, deposit, withdrawal, etc)',
  })
  transaction_type: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'If this is a reversal, ID of original entry',
  })
  reversed_entry_id: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is this entry a reversal',
  })
  is_reversal: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'When this entry was reversed',
  })
  reversed_at: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'User who created this entry',
  })
  created_by: string;

  @BelongsTo(() => User, 'created_by')
  creator: User;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updated_at: Date;
}

// Note: Indexes should be created in database migrations
