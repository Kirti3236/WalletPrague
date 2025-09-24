import { Table, Column, DataType, Model, PrimaryKey, Default, AllowNull, ForeignKey, Index, BelongsTo } from 'sequelize-typescript';
import { Transaction } from './transaction.model';
import { User } from './user.model';
import { DisputeStatusCatalog } from './dispute-status.model';

export enum DisputeType {
  CHARGEBACK = 'chargeback',
  COMPLAINT = 'complaint',
  UNAUTHORIZED = 'unauthorized',
}

// status catalog replaces enum

@Table({
  tableName: 'yapague_disputes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class Dispute extends Model<Dispute> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @ForeignKey(() => Transaction)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare transaction_id: string;

  @ForeignKey(() => User)
  @Index
  @Column({ type: DataType.UUID, allowNull: false })
  declare user_id: string;

  @AllowNull(false)
  @Column({ type: DataType.ENUM(...Object.values(DisputeType)) })
  declare dispute_type: DisputeType;

  @ForeignKey(() => DisputeStatusCatalog)
  @AllowNull(false)
  @Index
  @Column({ type: DataType.STRING(32) })
  declare status: string;

  @BelongsTo(() => DisputeStatusCatalog, { foreignKey: 'status', targetKey: 'code', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' })
  declare statusRef?: DisputeStatusCatalog;

  @AllowNull(false)
  @Column({ type: DataType.DECIMAL(18, 2) })
  declare amount: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(3) })
  declare currency: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare reason?: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare resolution?: string;

  @AllowNull(true)
  @Column({ type: DataType.DATE })
  declare resolved_at?: Date | null;
}
