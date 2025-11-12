import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AddCardDto {
  @ApiProperty({
    description: 'User ID (optional - defaults to authenticated user from JWT token)',
    example: 'ac6b6a56-7c3a-4b61-9fb0-4f7df0f9fa21',
    required: false,
  })
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: 'Card brand', example: 'VISA' })
  brand: string;

  @ApiProperty({
    description: 'Last 4 digits of card',
    example: '4242',
    minLength: 4,
    maxLength: 4,
  })
  last4: string;

  @ApiProperty({
    description: 'Expiry month (1-12)',
    example: 12,
    minimum: 1,
    maximum: 12,
  })
  expiry_month: number;

  @ApiProperty({ description: 'Expiry year', example: 2030 })
  expiry_year: number;

  @ApiProperty({
    description: 'Set as default payment method',
    example: true,
    required: false,
  })
  is_default?: boolean;
}

export class AddBankAccountDto {
  @ApiProperty({
    description: 'User ID (optional - defaults to authenticated user from JWT token)',
    example: 'ac6b6a56-7c3a-4b61-9fb0-4f7df0f9fa21',
    required: false,
  })
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: 'Bank name', example: 'Banco de Centro' })
  bank_name: string;

  @ApiProperty({
    description: 'Account type',
    example: 'checking',
    enum: ['checking', 'savings'],
  })
  account_type: 'checking' | 'savings';

  @ApiProperty({
    description: 'Last 4 digits of account',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  last4: string;

  @ApiProperty({
    description: 'Set as default bank account',
    example: false,
    required: false,
  })
  is_default?: boolean;
}
