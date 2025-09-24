import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull, ForeignKey, Index } from 'sequelize-typescript';
import { Transaction } from './transaction.model';

export enum CommonStatus3 {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
}

@Table({
  tableName: 'yapague_transaction_codes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class TransactionCode extends Model<TransactionCode> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => Transaction)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare transaction_id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(20) })
  declare code: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare amount: string;

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(CommonStatus3)) })
  declare status: CommonStatus3;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare expires_at?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare used_at?: Date | null;
}
