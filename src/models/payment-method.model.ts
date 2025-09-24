import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull, ForeignKey, Index } from 'sequelize-typescript';
import { User } from './user.model';

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
}

export enum PaymentMethodBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMERICAN_EXPRESS = 'american_express',
  DISCOVER = 'discover',
  RUPAY = 'rupay',
}

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
}

@Table({
  tableName: 'yapague_payment_methods',
  underscored: true,
  timestamps: true,
})
export class PaymentMethod extends Model<PaymentMethod> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => User)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare user_id: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(50) })
  declare gateway?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255) })
  declare gateway_token?: string; // encrypt at rest (app layer)

  @AllowNull(true)
  @Column({ type: DataType.ENUM(...Object.values(PaymentMethodType)) })
  declare type?: PaymentMethodType;

  @AllowNull(true)
  @Column({ type: DataType.ENUM(...Object.values(PaymentMethodBrand)) })
  declare brand?: PaymentMethodBrand;

  @AllowNull(true)
  @Column({ type: DataType.STRING(4) })
  declare last4?: string;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER })
  declare expiry_month?: number;

  @AllowNull(true)
  @Column({ type: DataType.INTEGER })
  declare expiry_year?: number;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  declare bank_name?: string;

  @AllowNull(true)
  @Column({ type: DataType.ENUM(...Object.values(BankAccountType)) })
  declare account_type?: BankAccountType;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN })
  declare is_default: boolean;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  declare is_active: boolean;
}
