import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull } from 'sequelize-typescript';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Table({
  tableName: 'yapague_settlements',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Settlement extends Model<Settlement> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(100) })
  declare batch_id: string;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare total_amount: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare transaction_count: number;

  @AllowNull(false)
  @Column({ type: DataType.DATE })
  declare settlement_date: Date;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(SettlementStatus)) })
  declare status: SettlementStatus;

  @AllowNull(true)
  @Column({ type: DataType.STRING(50) })
  declare gateway?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(255) })
  declare gateway_reference?: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare completed_at?: Date | null;
}
