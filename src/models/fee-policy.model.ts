import {
  Table,
  Column,
  DataType,
  Model,
  PrimaryKey,
  AllowNull,
  Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'yapague_fee_policies',
  underscored: true,
  timestamps: false,
})
export class FeePolicy extends Model<FeePolicy> {
  @PrimaryKey
  @Column({ type: DataType.STRING(64) })
  declare code: string; // e.g., 'transfer_fee_flat', 'withdrawal_fee_flat'

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare amount: string; // flat amount in currency

  @AllowNull(false)
  @Default('HNL')
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  declare is_active: boolean;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255) })
  declare description?: string;
}
