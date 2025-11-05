import { IsString, IsNumber, IsUUID, IsOptional, IsEnum, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType, NormalBalance } from '../../../models/chart-of-accounts.model';
import { JournalType } from '../../../models/journal.model';

// Chart of Accounts DTOs
export class CreateChartOfAccountsDto {
  @IsString()
  account_number: string;

  @IsString()
  account_name: string;

  @IsEnum(AccountType)
  account_type: AccountType;

  @IsEnum(NormalBalance)
  normal_balance: NormalBalance;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  is_active?: boolean;
}

export class UpdateChartOfAccountsDto {
  @IsOptional()
  @IsString()
  account_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  is_active?: boolean;
}

// Journal DTOs
export class CreateJournalDto {
  @IsString()
  journal_code: string;

  @IsString()
  journal_name: string;

  @IsEnum(JournalType)
  journal_type: JournalType;

  @IsOptional()
  @IsString()
  description?: string;
}

// Journal Entry DTOs
export class CreateJournalEntryDto {
  @IsUUID()
  journal_id: string;

  @IsString()
  entry_date: string; // ISO date string

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  debit_account_id: string;

  @IsUUID()
  credit_account_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsUUID()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  transaction_type?: string;
}

export class ReverseJournalEntryDto {
  @IsUUID()
  journal_entry_id: string;
}

// Reporting DTOs
export class TrialBalanceFilterDto {
  @IsOptional()
  @IsString()
  as_of_date?: string; // ISO date string
}

export class AccountLedgerFilterDto {
  @IsOptional()
  @IsString()
  start_date?: string; // ISO date string

  @IsOptional()
  @IsString()
  end_date?: string; // ISO date string
}

export class ZeroSumValidationDto {
  @IsString()
  start_date: string; // ISO date string

  @IsString()
  end_date: string; // ISO date string
}
