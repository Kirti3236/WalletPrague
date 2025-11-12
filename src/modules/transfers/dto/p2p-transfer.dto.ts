import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsIn } from 'class-validator';
import { IsAmount } from '../../../common/validators/amount.validator';

export class P2PTransferDto {
  @ApiProperty({ 
    format: 'uuid',
    description: 'Sender User ID (automatically set from JWT token for security)',
    required: false,
  })
  @IsOptional()
  sender_user_id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sender_wallet_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  receiver_wallet_id: string;

  @ApiProperty({
    description: 'Amount (can be string or number)',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @IsAmount()
  amount: string | number;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'] })
  @IsOptional()
  @IsIn(['LPS', 'USD'])
  currency?: string;
}
