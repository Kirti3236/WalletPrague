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
} from 'sequelize-typescript';
import { Transaction } from './transaction.model';

export enum FeeType {
  TRANSACTION_FEE = 'transaction_fee',
  WITHDRAWAL_FEE = 'withdrawal_fee',
  TRANSFER_FEE = 'transfer_fee',
  CONVERSION_FEE = 'conversion_fee',
}

@Table({
  tableName: 'yapague_fees',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Fee extends Model<Fee> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => Transaction)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare transaction_id: string;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(FeeType)) })
  declare fee_type: FeeType;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare fee_amount: string;

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(5, 4) })
  declare fee_percentage?: string;
}
