import { IsOptional, IsString, IsEnum, IsNumber, IsDateString } from 'class-validator';

export enum ReconciliationStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  EXCEPTION = 'exception',
}

export class UploadStatementDto {
  @IsString()
  file_name: string;

  @IsString()
  file_format: 'csv' | 'ofx';

  @IsDateString()
  statement_date: string;

  @IsOptional()
  @IsString()
  bank_account_id?: string;
}

export class MatchTransactionDto {
  @IsString()
  statement_line_id: string;

  @IsString()
  transaction_id: string;
}

export class UpdateExceptionDto {
  @IsEnum(ReconciliationStatus)
  status: ReconciliationStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListStatementsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;
}

