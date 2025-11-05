import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class EvaluateRiskDto {
  @ApiProperty({ description: 'User ID to evaluate' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction type' })
  @IsString()
  transaction_type: string;

  @ApiPropertyOptional({ description: 'Recipient user ID (for transfers)' })
  @IsOptional()
  @IsUUID()
  recipient_id?: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class GetLimitCountersDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({ enum: ['daily', 'monthly', 'both'], default: 'both' })
  @IsOptional()
  @IsEnum(['daily', 'monthly', 'both'])
  period?: 'daily' | 'monthly' | 'both' = 'both';
}

