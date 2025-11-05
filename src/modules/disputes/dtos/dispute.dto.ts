import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDecimal, MinLength, MaxLength } from 'class-validator';
import { DisputeType } from '../../../models/dispute.model';

export class CreateDisputeDto {
  @ApiProperty({ description: 'Transaction ID for the dispute', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  transaction_id: string;

  @ApiProperty({ description: 'Type of dispute', enum: DisputeType, example: DisputeType.COMPLAINT })
  @IsEnum(DisputeType)
  @IsNotEmpty()
  dispute_type: DisputeType;

  @ApiProperty({ description: 'Dispute reason/description', example: 'Product not received' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}

export class UpdateDisputeStatusDto {
  @ApiProperty({ description: 'New status', example: 'under_review' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: 'Resolution notes', example: 'Dispute resolved in favor of customer' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  resolution?: string;
}

export class ListDisputesDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Filter by transaction ID' })
  @IsUUID()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ description: 'Filter by status', example: 'pending' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by dispute type', enum: DisputeType })
  @IsEnum(DisputeType)
  @IsOptional()
  dispute_type?: DisputeType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}


