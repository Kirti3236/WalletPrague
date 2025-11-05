import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'yapague_limit_counters_monthly',
  timestamps: true,
  underscored: true,
})
export class LimitCounterMonthly extends Model {
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
    type: DataType.STRING(7),
    allowNull: false,
    comment: 'The month for this counter in YYYY-MM format',
  })
  month_year: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total amount transacted this month',
  })
  total_amount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of transactions this month',
  })
  transaction_count: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Is this counter locked (after month end)',
  })
  is_locked: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    comment: 'When this counter resets (first day of next month)',
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
