import { Column, Model, Table, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'yapague_idempotency_keys',
  timestamps: true,
  underscored: true,
})
export class IdempotencyKey extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  idempotency_key: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    comment: 'Cached response payload',
  })
  response_payload: Record<string, any>;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'HTTP status code of the response',
  })
  http_status_code: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'When this idempotency key expires (24h from creation)',
  })
  expires_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updated_at: Date;
}

// Note: Indexes should be created in database migrations
