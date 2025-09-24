import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsIn, Matches } from 'class-validator';

export class P2PTransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sender_user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sender_wallet_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_wallet_id: string;

  @ApiProperty({ description: 'Amount as string to avoid float rounding' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount: string;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'] })
  @IsOptional()
  @IsIn(['LPS', 'USD'])
  currency?: string;
}
