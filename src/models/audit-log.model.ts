import {
  Table,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Default,
  AllowNull,
  Index,
} from 'sequelize-typescript';

@Table({
  tableName: 'yapague_audit_logs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['created_at'] },
  ],
})
export class AuditLog extends Model<AuditLog> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Index
  @Column({ type: DataType.STRING(50) })
  declare entity_type: string;

  @AllowNull(false)
  @Index
  @Column({ type: DataType.UUID })
  declare entity_id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(50) })
  declare action: string;

  @AllowNull(true)
  @Column({ type: DataType.UUID })
  declare actor_id?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20) })
  declare actor_type?: string;

  @AllowNull(true)
  @Column({ type: DataType.JSONB })
  declare old_values?: unknown;

  @AllowNull(true)
  @Column({ type: DataType.JSONB })
  declare new_values?: unknown;

  @AllowNull(true)
  @Column({ type: DataType.INET })
  declare ip_address?: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare user_agent?: string;
}
