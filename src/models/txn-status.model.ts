import { Table, Column, DataType, Model, PrimaryKey } from 'sequelize-typescript';

@Table({
  tableName: 'yapague_txn_statuses',
  underscored: true,
  timestamps: false,
})
export class TxnStatus extends Model<TxnStatus> {
  @PrimaryKey
  @Column({ type: DataType.STRING(32) })
  declare code: string; // e.g., 'pending','processing','completed','failed','expired','cancelled','rejected'

  @Column({ type: DataType.STRING(100) })
  declare label?: string;

  @Column({ type: DataType.STRING(255) })
  declare description?: string;
}
