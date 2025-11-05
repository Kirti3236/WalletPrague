import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';

@Table({
  tableName: 'yapague_general_ledger',
  timestamps: true,
  underscored: true,
})
export class GeneralLedger extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => require('./chart-of-accounts.model').ChartOfAccounts)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to chart of accounts',
  })
  account_id: string;

  @BelongsTo(() => require('./chart-of-accounts.model').ChartOfAccounts, 'account_id')
  account: any;

  @ForeignKey(() => require('./journal-entry.model').JournalEntry)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to journal entry',
  })
  journal_entry_id: string;

  @BelongsTo(() => require('./journal-entry.model').JournalEntry, 'journal_entry_id')
  journal_entry: any;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'Entry date',
  })
  entry_date: Date;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'Entry reference number',
  })
  entry_number: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Entry description',
  })
  description: string;

  @Column({
    type: DataType.ENUM('debit', 'credit'),
    allowNull: false,
  })
  entry_type: 'debit' | 'credit';

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Amount of this entry',
  })
  amount: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Running balance after this entry',
  })
  running_balance: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is this entry reversed',
  })
  is_reversed: boolean;

  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'Reference to reversal entry',
  })
  reversal_entry_id: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    comment: 'Associated transaction ID (transfer, deposit, etc)',
  })
  transaction_id: string;

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
