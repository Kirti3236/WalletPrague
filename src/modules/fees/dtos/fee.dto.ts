import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDecimal, IsBoolean, IsNumber, Min } from 'class-validator';
import { FeeType } from '../../../models/fee.model';

export class CreateFeePolicyDto {
  @ApiProperty({ description: 'Fee policy code', example: 'transfer_fee_flat' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Fee amount', example: '0.50' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency', example: 'HNL', default: 'HNL' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateFeePolicyDto {
  @ApiPropertyOptional({ description: 'Fee amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Policy description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ListFeesDto {
  @ApiPropertyOptional({ description: 'Filter by transaction ID' })
  @IsUUID()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ description: 'Filter by fee type', enum: FeeType })
  @IsEnum(FeeType)
  @IsOptional()
  fee_type?: FeeType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}


