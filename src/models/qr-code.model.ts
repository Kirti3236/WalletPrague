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
import { User } from './user.model';
import { Transaction } from './transaction.model';

export enum QrType {
  PAYMENT_REQUEST = 'payment_request',
  WITHDRAWAL = 'withdrawal',
  MERCHANT_PAYMENT = 'merchant_payment',
}

export enum CommonStatus3 {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
}

@Table({
  tableName: 'yapague_qr_codes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class QrCode extends Model<QrCode> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => User)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare user_id: string;

  @ForeignKey(() => Transaction)
  @Index
  @Column({ type: DataType.UUID, allowNull: true })
  declare transaction_id?: string | null;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(QrType)) })
  declare qr_type: QrType;

  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  declare qr_data: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare amount?: string;

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency?: string;

  @AllowNull(false)
  @Default(CommonStatus3.ACTIVE)
  @Column({ type: DataType.ENUM(...Object.values(CommonStatus3)) })
  declare status: CommonStatus3;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare expires_at?: Date | null;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare used_at?: Date | null;

  // Associations
  @BelongsTo(() => User, 'user_id')
  declare user?: User;

  @BelongsTo(() => Transaction, 'transaction_id')
  declare transaction?: Transaction;
}
