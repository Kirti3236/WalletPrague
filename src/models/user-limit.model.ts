import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';
import { LimitPolicy } from './limit-policy.model';

@Table({
  tableName: 'yapague_user_limits',
  timestamps: true,
  underscored: true,
})
export class UserLimit extends Model {
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
    unique: true,
  })
  user_id: string;

  @BelongsTo(() => User, 'user_id')
  user: User;

  @ForeignKey(() => LimitPolicy)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    comment: 'Reference to limit policy',
  })
  policy_id: string;

  @BelongsTo(() => LimitPolicy, 'policy_id')
  policy: LimitPolicy;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Day of month to reset monthly counters (1-28)',
  })
  reset_day_of_month: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who assigned this policy',
  })
  created_by: string;

  @BelongsTo(() => User, 'created_by')
  creator: User;

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
