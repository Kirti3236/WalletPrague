import {
  Table,
  Column,
  DataType,
  BeforeCreate,
  BeforeUpdate,
  AfterSave,
  Index,
  PrimaryKey,
  Model,
  HasMany,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { writeAudit } from '../common/utils/audit.util';
import { QrCode } from './qr-code.model';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Table({
  tableName: 'yapague_users',
  underscored: true,
  modelName: 'User',
  timestamps: true,
})
export class User extends Model<User> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ApiProperty({ description: 'User email address', required: false })
  @Index({ unique: true })
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'user_email',
  })
  declare user_email: string;

  @ApiProperty({ description: 'Unique username', required: true })
  @Index({ unique: true })
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    unique: true,
    field: 'user_name',
  })
  declare user_name: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @Index({ unique: true })
  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    field: 'user_phone_number',
  })
  declare user_phone_number?: string;

  @ApiProperty({ description: 'User DNI number', required: true })
  @Index({ unique: true })
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true,
    field: 'user_DNI_number',
  })
  declare user_DNI_number: string;

  @Exclude()
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    field: 'user_password',
  })
  declare user_password: string;

  @ApiProperty({ description: 'User first name', required: true })
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    field: 'user_first_name',
  })
  declare user_first_name: string;

  @ApiProperty({ description: 'User last name', required: true })
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    field: 'user_last_name',
  })
  declare user_last_name: string;

  @ApiProperty({ description: 'Front ID document file path', required: false })
  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    field: 'front_document_name',
  })
  declare front_document_name?: string;

  @ApiProperty({ description: 'Back ID document file path', required: false })
  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    field: 'back_document_name',
  })
  declare back_document_name?: string;

  @ApiProperty({ description: 'User status', enum: UserStatus })
  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    defaultValue: UserStatus.ACTIVE,
  })
  declare user_status: UserStatus;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.USER,
  })
  declare user_role: UserRole;

  @ApiProperty({ description: 'Last login timestamp' })
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'last_login_at',
  })
  declare lastLoginAt?: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'reset_token',
  })
  declare resetToken?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'reset_token_expires_at',
  })
  declare resetTokenExpiresAt?: Date;

  @ApiProperty({ description: 'Front ID document file URL' })
  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    field: 'front_id_file_url',
  })
  declare frontIdFileUrl?: string;

  @ApiProperty({ description: 'Back ID document file URL' })
  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    field: 'back_id_file_url',
  })
  declare backIdFileUrl?: string;

  // Hooks
  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User) {
    if (instance.user_password && !instance.user_password.startsWith('$2')) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
      instance.user_password = await bcrypt.hash(
        instance.user_password,
        saltRounds,
      );
    }
    (instance as any).updated_at = new Date();
  }

  // After save hook to write minimal audit
  @AfterSave
  static logAuditHook(instance: User) {
    const { id, user_status, user_role } = instance;
    void writeAudit('user', id, 'update', null, { user_status, user_role });
  }

  // Methods
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.user_password);
  }

  get fullName(): string {
    return `${this.user_first_name} ${this.user_last_name}`;
  }

  // Associations
  @HasMany(() => QrCode, 'user_id')
  declare qrCodes?: QrCode[];
}
