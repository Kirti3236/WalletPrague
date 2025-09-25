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
  BelongsTo,
} from 'sequelize-typescript';
import { Transaction } from './transaction.model';
import { Wallet } from './wallet.model';

export enum LedgerEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Table({
  tableName: 'yapague_ledgers',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['transaction_id'] },
    { fields: ['wallet_id'] },
    { fields: ['created_at'] },
  ],
})
export class Ledger extends Model<Ledger> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => Transaction)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare transaction_id: string;

  @BelongsTo(() => Transaction, {
    foreignKey: 'transaction_id',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare transaction?: Transaction;

  @ForeignKey(() => Wallet)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare wallet_id: string;

  @BelongsTo(() => Wallet, {
    foreignKey: 'wallet_id',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare wallet?: Wallet;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(LedgerEntryType)) })
  declare entry_type: LedgerEntryType;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare amount: string;

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare balance_before?: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare balance_after?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20) })
  declare account_code?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(500) })
  declare description?: string;
}
