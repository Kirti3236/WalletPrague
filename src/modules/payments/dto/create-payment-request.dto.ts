import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsIn } from 'class-validator';
import { IsAmount } from '../../../common/validators/amount.validator';

export class CreatePaymentRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  wallet_id: string;

  @ApiProperty({
    description: 'Amount (can be string or number)',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @IsAmount()
  amount: string | number;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'] })
  @IsOptional()
  @IsIn(['LPS', 'USD'])
  currency?: string;
}
