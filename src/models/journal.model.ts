import { Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';

export enum JournalType {
  GENERAL = 'general',
  SALES = 'sales',
  PURCHASES = 'purchases',
  CASH_RECEIPTS = 'cash_receipts',
  CASH_DISBURSEMENTS = 'cash_disbursements',
  PAYROLL = 'payroll',
  ADJUSTING = 'adjusting',
}

@Table({
  tableName: 'yapague_journals',
  timestamps: true,
  underscored: true,
})
export class Journal extends Model {
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
  journal_code: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Journal name',
  })
  journal_name: string;

  @Column({
    type: DataType.ENUM(...Object.values(JournalType)),
    allowNull: false,
  })
  journal_type: JournalType;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Journal description',
  })
  description: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Is this journal active',
  })
  is_active: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Next entry number for this journal',
  })
  next_entry_number: number;

  @HasMany(() => require('./journal-entry.model').JournalEntry, 'journal_id')
  entries: any[];

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    comment: 'User who created this journal',
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
