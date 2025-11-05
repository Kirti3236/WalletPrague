import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

export enum RestrictionType {
  GEOFENCE = 'geofence',
  DEVICE = 'device',
  IP_ADDRESS = 'ip_address',
}

@Table({
  tableName: 'yapague_restrictions',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['restriction_type'] },
    { fields: ['is_active'] },
  ],
})
export class Restriction extends Model<Restriction> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  user_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(RestrictionType)),
    allowNull: false,
  })
  restriction_type: RestrictionType;

  @Column(DataType.TEXT)
  restriction_value: string; // lat,lon for geofence; device_id for device; IP for IP

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
  })
  latitude: number;

  @Column({
    type: DataType.DECIMAL(10, 6),
    allowNull: true,
  })
  longitude: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  radius_km: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active: boolean;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.UUID)
  created_by: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
}
