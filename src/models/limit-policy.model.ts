import { Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { UserLimit } from './user-limit.model';

@Table({
  tableName: 'yapague_limit_policies',
  timestamps: true,
  underscored: true,
})
export class LimitPolicy extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
  })
  declare policy_code: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Human-readable policy name',
  })
  declare policy_name: string;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 5000.00,
    comment: 'Maximum amount per single transaction',
  })
  declare max_transaction_amount: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 20000.00,
    comment: 'Maximum total amount per day',
  })
  declare max_daily_amount: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 100000.00,
    comment: 'Maximum total amount per month',
  })
  declare max_monthly_amount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: 'Maximum number of transactions per day',
  })
  declare max_daily_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Maximum number of transactions per month',
  })
  declare max_monthly_count: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is this policy active and assignable to users',
  })
  declare is_active: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Description of the policy',
  })
  declare description: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who created this policy',
  })
  declare created_by: string;

  @BelongsTo(() => User, 'created_by')
  declare creator: User;

  @HasMany(() => UserLimit, 'policy_id')
  declare user_limits: UserLimit[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare updated_at: Date;
}

// Note: Indexes should be created in database migrations
