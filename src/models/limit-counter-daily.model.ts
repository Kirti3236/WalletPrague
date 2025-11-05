import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'yapague_limit_counters_daily',
  timestamps: true,
  underscored: true,
})
export class LimitCounterDaily extends Model {
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
    comment: 'User ID for this counter',
  })
  user_id: string;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'The date for this counter (YYYY-MM-DD)',
  })
  counter_date: Date;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total amount transacted today',
  })
  total_amount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of transactions today',
  })
  transaction_count: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is this counter locked (after 24h)',
  })
  is_locked: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'When this counter resets (midnight UTC)',
  })
  reset_at: Date;

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
