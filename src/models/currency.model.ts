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
  tableName: 'yapague_currencies',
  underscored: true,
  timestamps: true,
})
export class Currency extends Model<Currency> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID })
  declare id: string;

  @AllowNull(false)
  @Index({ unique: true })
  @Column({ type: DataType.STRING(3) })
  declare iso_code: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING(100) })
  declare name: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING(10) })
  declare symbol?: string;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER })
  declare decimal_places: number;

  @AllowNull(false)
  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  declare is_active: boolean;

  @AllowNull(true)
  @Column({ type: DataType.DECIMAL(15, 8) })
  declare exchange_rate_usd?: string;
}
