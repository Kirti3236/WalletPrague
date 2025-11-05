import { Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum NormalBalance {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Table({
  tableName: 'yapague_chart_of_accounts',
  timestamps: true,
  underscored: true,
})
export class ChartOfAccounts extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true,
  })
  account_number: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Account name (e.g., Cash, Accounts Payable)',
  })
  account_name: string;

  @Column({
    type: DataType.ENUM(...Object.values(AccountType)),
    allowNull: false,
  })
  account_type: AccountType;

  @Column({
    type: DataType.ENUM(...Object.values(NormalBalance)),
    allowNull: false,
  })
  normal_balance: NormalBalance;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Account description',
  })
  description: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is this account active',
  })
  is_active: boolean;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Current account balance',
  })
  current_balance: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who created this account',
  })
  created_by: string;

  @BelongsTo(() => User, 'created_by')
  creator: User;

  @HasMany(() => require('./general-ledger.model').GeneralLedger, 'account_id')
  ledger_entries: any[];

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
