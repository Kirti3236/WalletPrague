import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull, ForeignKey, Index, BeforeUpdate, AfterSave, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { writeAudit } from '../common/utils/audit.util';

export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Table({
  tableName: 'yapague_wallets',
  underscored: true,
  timestamps: true,
})
export class Wallet extends Model<Wallet> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Index({ name: 'wallet_user_currency_uq', unique: true })
  @Column({ type: DataType.UUID })
  declare user_id: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  declare wallet_name?: string;

  @AllowNull(false)
  @Default('HNL')
  @Index({ name: 'wallet_user_currency_uq', unique: true })
  @Column({ type: DataType.STRING(3) })
  declare currency: string; // ISO code

  @AllowNull(false)
  @Default('0.00')
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare available_balance: string;

  @AllowNull(false)
  @Default('0.00')
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare ledger_balance: string;

  @AllowNull(false)
  @Default('0.00')
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare reserved_balance: string;

  @AllowNull(false)
  @Default(WalletStatus.ACTIVE)
  @Column({ type: DataType.ENUM(...Object.values(WalletStatus)) })
  declare status: WalletStatus;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare daily_limit?: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare monthly_limit?: string;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'user_id', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  declare user?: User;

  @BeforeUpdate
  static touch(instance: Wallet) {
    (instance as any).updated_at = new Date();
  }

  @AfterSave
  static logAudit(instance: Wallet, _options: any) {
    const { id, status, available_balance, currency } = instance as any;
    void writeAudit('wallet', id, 'update', null, { status, available_balance, currency });
  }
}
