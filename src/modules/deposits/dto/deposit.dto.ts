import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';
import { IsAmount } from '../../../common/validators/amount.validator';

export class DepositFromCardDto {
  @ApiProperty({
    format: 'uuid',
    description: 'User ID (optional - defaults to authenticated user from JWT token)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ format: 'uuid', description: 'Wallet ID to deposit into' })
  @IsUUID()
  wallet_id: string;

  @ApiProperty({ format: 'uuid', description: 'Payment method ID (card)' })
  @IsUUID()
  payment_method_id: string;

  @ApiProperty({
    description: 'Amount to deposit (can be string or number)',
    example: '100.00',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @IsAmount()
  amount: string | number;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'], default: 'LPS' })
  @IsOptional()
  @IsString()
  @IsIn(['LPS', 'USD'])
  currency?: string;

  @ApiProperty({
    required: false,
    description: 'Optional description for the deposit',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class DepositFromBankDto {
  @ApiProperty({
    format: 'uuid',
    description: 'User ID (optional - defaults to authenticated user from JWT token)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ format: 'uuid', description: 'Wallet ID to deposit into' })
  @IsUUID()
  wallet_id: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Payment method ID (bank account)',
  })
  @IsUUID()
  payment_method_id: string;

  @ApiProperty({
    description: 'Amount to deposit (can be string or number)',
    example: '500.00',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @IsAmount()
  amount: string | number;

  @ApiProperty({ required: false, enum: ['LPS', 'USD'], default: 'LPS' })
  @IsOptional()
  @IsString()
  @IsIn(['LPS', 'USD'])
  currency?: string;

  @ApiProperty({
    required: false,
    description: 'Optional description for the deposit',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
