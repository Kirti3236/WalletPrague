import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class GenerateTransactionReportDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  start_date: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsString()
  end_date: string;

  @ApiPropertyOptional({ enum: ['csv', 'pdf', 'json'], default: 'json' })
  @IsOptional()
  @IsEnum(['csv', 'pdf', 'json'])
  format?: 'csv' | 'pdf' | 'json' = 'json';

  @ApiPropertyOptional({ description: 'Transaction type filter' })
  @IsOptional()
  @IsString()
  transaction_type?: string;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsString()
  status?: string;
}

