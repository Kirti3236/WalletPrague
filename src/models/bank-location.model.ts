import {
  Table,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Default,
  AllowNull,
} from 'sequelize-typescript';

@Table({
  tableName: 'yapague_bank_locations',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
})
export class BankLocation extends Model<BankLocation> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(100) })
  declare bank_name: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  declare branch_name?: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT })
  declare address?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  declare city?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  declare state?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(3) })
  declare country?: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(10, 8) })
  declare latitude?: string;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(11, 8) })
  declare longitude?: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(20) })
  declare phone?: string;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  declare is_active: boolean;
}
