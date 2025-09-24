import { Table, Column, DataType, Model, PrimaryKey } from 'sequelize-typescript';

@Table({
  tableName: 'yapague_dispute_statuses',
  underscored: true,
  timestamps: false,
})
export class DisputeStatusCatalog extends Model<DisputeStatusCatalog> {
  @PrimaryKey
  @Column({ type: DataType.STRING(32) })
  declare code: string; // 'initiated','under_review','resolved','rejected'

  @Column({ type: DataType.STRING(100) })
  declare label?: string;

  @Column({ type: DataType.STRING(255) })
  declare description?: string;
}
