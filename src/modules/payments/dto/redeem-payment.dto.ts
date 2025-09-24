import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RedeemPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  qr_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_wallet_id: string;
}
