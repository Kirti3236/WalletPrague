import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsIn, Matches } from 'class-validator';

export class GenerateWithdrawalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  wallet_id: string;

  @ApiProperty({ description: 'Amount as string to avoid float rounding' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount: string;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'] })
  @IsOptional()
  @IsString()
  @IsIn(['LPS', 'USD'])
  currency?: string;
}
