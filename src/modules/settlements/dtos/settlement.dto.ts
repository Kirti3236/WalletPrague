import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsDateString, Min } from 'class-validator';
import { SettlementStatus } from '../../../models/settlement.model';

export class CreateSettlementDto {
  @ApiProperty({ description: 'Batch ID for the settlement', example: 'BATCH-2025-11-05-001' })
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @ApiProperty({ description: 'Total amount to settle', example: 10000.00 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  total_amount: number;

  @ApiProperty({ description: 'Currency', example: 'HNL' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'Number of transactions in batch', example: 50 })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  transaction_count: number;

  @ApiProperty({ description: 'Settlement date', example: '2025-11-05' })
  @IsDateString()
  @IsNotEmpty()
  settlement_date: string;

  @ApiPropertyOptional({ description: 'Gateway name', example: 'PaymentGateway' })
  @IsString()
  @IsOptional()
  gateway?: string;

  @ApiPropertyOptional({ description: 'Gateway reference', example: 'REF-123456' })
  @IsString()
  @IsOptional()
  gateway_reference?: string;
}

export class UpdateSettlementStatusDto {
  @ApiProperty({ description: 'New status', enum: SettlementStatus })
  @IsEnum(SettlementStatus)
  @IsNotEmpty()
  status: SettlementStatus;

  @ApiPropertyOptional({ description: 'Gateway reference' })
  @IsString()
  @IsOptional()
  gateway_reference?: string;
}

export class ListSettlementsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: SettlementStatus })
  @IsEnum(SettlementStatus)
  @IsOptional()
  status?: SettlementStatus;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Filter by date from', example: '2025-11-01' })
  @IsDateString()
  @IsOptional()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter by date to', example: '2025-11-30' })
  @IsDateString()
  @IsOptional()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}


