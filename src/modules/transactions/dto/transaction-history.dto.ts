import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsDateString, IsNumberString, IsUUID, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class TransactionHistoryDto {
  @ApiProperty({ 
    description: 'Page number for pagination', 
    example: 1, 
    required: false,
    minimum: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    example: 20, 
    required: false,
    minimum: 1,
    maximum: 100 
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiProperty({ 
    description: 'Filter by transaction type', 
    enum: ['all', 'payments', 'collections', 'deposits', 'withdrawals', 'transfers'], 
    example: 'all',
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'payments', 'collections', 'deposits', 'withdrawals', 'transfers'])
  type?: string = 'all';

  @ApiProperty({ 
    description: 'Start date for filtering (ISO 8601)', 
    example: '2024-01-01T00:00:00.000Z',
    required: false 
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  start_date?: string;

  @ApiProperty({ 
    description: 'End date for filtering (ISO 8601)', 
    example: '2024-12-31T23:59:59.999Z',
    required: false 
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  end_date?: string;

  @ApiProperty({ 
    description: 'Minimum amount for filtering', 
    example: '10.00',
    required: false 
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Minimum amount must be a valid number string' })
  min_amount?: string;

  @ApiProperty({ 
    description: 'Maximum amount for filtering', 
    example: '1000.00',
    required: false 
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Maximum amount must be a valid number string' })
  max_amount?: string;

  @ApiProperty({ 
    description: 'Currency filter', 
    enum: ['LPS', 'USD'], 
    example: 'LPS',
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsIn(['LPS', 'USD'])
  currency?: string;

  @ApiProperty({ 
    description: 'User ID to filter transactions', 
    format: 'uuid',
    required: true 
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id: string;
}

export class TransactionSearchDto {
  @ApiProperty({ 
    description: 'Search query for transaction description or notes', 
    example: 'coffee payment',
    required: true,
    minLength: 2,
    maxLength: 100 
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  query?: string;

  @ApiProperty({ 
    description: 'Search by specific amount', 
    example: '25.50',
    required: false 
  })
  @IsOptional()
  @IsNumberString({}, { message: 'Amount must be a valid number string' })
  amount?: string;

  @ApiProperty({ 
    description: 'User ID for search scope', 
    format: 'uuid',
    required: true 
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id: string;

  @ApiProperty({ 
    description: 'Page number for pagination', 
    example: 1, 
    required: false,
    minimum: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    example: 20, 
    required: false,
    minimum: 1,
    maximum: 50 
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number = 20;
}

export class TransactionDetailsDto {
  @ApiProperty({ 
    description: 'Transaction ID', 
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsUUID(4, { message: 'Transaction ID must be a valid UUID' })
  transaction_id: string;

  @ApiProperty({ 
    description: 'User ID requesting the details', 
    format: 'uuid',
    required: true 
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id: string;
}

// Base DTOs (defined first to avoid circular dependencies)
export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number' })
  current_page: number;

  @ApiProperty({ description: 'Total number of pages' })
  total_pages: number;

  @ApiProperty({ description: 'Total number of records' })
  total_records: number;

  @ApiProperty({ description: 'Number of records per page' })
  per_page: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  has_next: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  has_previous: boolean;
}

export class TransactionSummaryDto {
  @ApiProperty({ description: 'Total amount sent' })
  total_sent: string;

  @ApiProperty({ description: 'Total amount received' })
  total_received: string;

  @ApiProperty({ description: 'Net balance change' })
  net_balance: string;

  @ApiProperty({ description: 'Number of transactions' })
  transaction_count: number;
}

export class TransactionItemDto {
  @ApiProperty({ description: 'Transaction ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Transaction amount' })
  amount: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Transaction status' })
  status: string;

  @ApiProperty({ description: 'Transaction description' })
  description?: string;

  @ApiProperty({ description: 'Other party name (sender/receiver)' })
  other_party?: string;

  @ApiProperty({ description: 'Transaction direction (incoming/outgoing)' })
  direction: 'incoming' | 'outgoing';

  @ApiProperty({ description: 'Transaction date' })
  created_at: Date;

  @ApiProperty({ description: 'Processing date' })
  processed_at?: Date;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({ description: 'List of transactions' })
  transactions: TransactionItemDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  pagination: PaginationMetaDto;

  @ApiProperty({ description: 'Filter summary' })
  summary: TransactionSummaryDto;
}
