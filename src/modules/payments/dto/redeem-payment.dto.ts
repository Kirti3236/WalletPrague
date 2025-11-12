import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class RedeemPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qr_id: string;

  @ApiProperty({ 
    format: 'uuid',
    description: 'Receiver User ID (automatically set from JWT token for security - this is the payer)',
    required: false,
  })
  @IsOptional()
  receiver_user_id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_wallet_id: string;
}
