import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { IsAmount } from '../../../common/validators/amount.validator';

export class GenerateQrDto {
  @ApiProperty({
    description: 'User ID generating the QR code',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id?: string;

  @ApiProperty({
    description: 'Wallet ID for the payment',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'Wallet ID must be a valid UUID' })
  wallet_id: string;

  @ApiProperty({
    description: 'Payment amount (can be string or number)',
    example: '50.00',
    oneOf: [{ type: 'string' }, { type: 'number' }],
  })
  @IsAmount()
  amount: string | number;

  @ApiProperty({
    description: 'Payment description/note',
    example: 'Coffee payment',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Currency code',
    enum: ['LPS', 'USD'],
    example: 'LPS',
    required: false,
  })
  @IsOptional()
  @IsIn(['LPS', 'USD'])
  currency?: string = 'LPS';
}

export class GetPaymentCodeDto {
  @ApiProperty({
    description: 'Payment code to validate',
    example: 'ABCD-1234',
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @MinLength(8, { message: 'Payment code must be at least 8 characters long' })
  @MaxLength(20, { message: 'Payment code must not exceed 20 characters' })
  @Matches(/^[A-Z0-9-]+$/, {
    message:
      'Payment code must contain only uppercase letters, numbers, and hyphens',
  })
  code: string;

  @ApiProperty({
    description: 'User ID requesting code details',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id: string;
}

export class SharePaymentDto {
  @ApiProperty({
    description: 'QR code ID to share',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'QR ID must be a valid UUID' })
  qr_id: string;

  @ApiProperty({
    description: 'User ID sharing the payment',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id?: string;

  @ApiProperty({
    description: 'Share method',
    enum: ['link', 'whatsapp', 'sms', 'email'],
    example: 'link',
    required: false,
  })
  @IsOptional()
  @IsIn(['link', 'whatsapp', 'sms', 'email'])
  share_method?: string = 'link';
}

export class ScanQrDto {
  @ApiProperty({
    description: 'QR code data or payment code',
    example: 'ABCD-1234 or QR data string',
    required: true,
  })
  @IsString()
  @MinLength(8, { message: 'QR data must be at least 8 characters long' })
  @MaxLength(1000, { message: 'QR data must not exceed 1000 characters' })
  qr_data: string;

  @ApiProperty({
    description: 'User ID scanning the QR',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  scanner_user_id?: string;

  @ApiProperty({
    description: 'Scanner wallet ID for payment',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'Scanner wallet ID must be a valid UUID' })
  scanner_wallet_id: string;
}

export class RedeemByCodeDto {
  @ApiProperty({
    description: 'Payment code to redeem',
    example: 'ABCD-1234',
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @MinLength(8, { message: 'Payment code must be at least 8 characters long' })
  @MaxLength(20, { message: 'Payment code must not exceed 20 characters' })
  @Matches(/^[A-Z0-9-]+$/, {
    message:
      'Payment code must contain only uppercase letters, numbers, and hyphens',
  })
  code: string;

  @ApiProperty({
    description: 'Receiver user ID',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'Receiver user ID must be a valid UUID' })
  receiver_user_id: string;

  @ApiProperty({
    description: 'Receiver wallet ID',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'Receiver wallet ID must be a valid UUID' })
  receiver_wallet_id: string;
}

export class ValidateCodeDto {
  @ApiProperty({
    description: 'Payment code to validate',
    example: 'ABCD-1234',
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @MinLength(8, { message: 'Payment code must be at least 8 characters long' })
  @MaxLength(20, { message: 'Payment code must not exceed 20 characters' })
  @Matches(/^[A-Z0-9-]+$/, {
    message:
      'Payment code must contain only uppercase letters, numbers, and hyphens',
  })
  code: string;

  @ApiProperty({
    description: 'User ID validating the code',
    format: 'uuid',
    required: true,
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  user_id: string;
}

// Response DTOs
export class GenerateQrResponseDto {
  @ApiProperty({ description: 'Generated QR code ID' })
  qr_id: string;

  @ApiProperty({ description: 'Payment code for manual entry' })
  code: string;

  @ApiProperty({ description: 'QR code data string' })
  qr_data: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Payment description' })
  description?: string;

  @ApiProperty({ description: 'QR code expiration time' })
  expires_at: Date;

  @ApiProperty({ description: 'QR code creation time' })
  created_at: Date;
}

export class PaymentCodeDetailsDto {
  @ApiProperty({ description: 'Payment code' })
  code: string;

  @ApiProperty({ description: 'QR code ID' })
  qr_id: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Payment description' })
  description?: string;

  @ApiProperty({ description: 'Code status' })
  status: string;

  @ApiProperty({ description: 'Is code expired' })
  is_expired: boolean;

  @ApiProperty({ description: 'Is code valid for payment' })
  is_valid: boolean;

  @ApiProperty({ description: 'Sender information' })
  sender: {
    name: string;
    username: string;
  };

  @ApiProperty({ description: 'Code expiration time' })
  expires_at: Date;

  @ApiProperty({ description: 'Code creation time' })
  created_at: Date;
}

export class SharePaymentResponseDto {
  @ApiProperty({ description: 'Shareable link or content' })
  share_content: string;

  @ApiProperty({ description: 'Share method used' })
  share_method: string;

  @ApiProperty({ description: 'QR code for sharing' })
  qr_code?: string;

  @ApiProperty({ description: 'Payment details' })
  payment_details: {
    amount: string;
    currency: string;
    description?: string;
    code: string;
  };
}

export class ValidateCodeResponseDto {
  @ApiProperty({ description: 'Whether code is valid' })
  is_valid: boolean;

  @ApiProperty({ description: 'Validation message' })
  message: string;

  @ApiProperty({ description: 'Code status' })
  status?: string;

  @ApiProperty({ description: 'Is code expired' })
  is_expired?: boolean;

  @ApiProperty({ description: 'Payment details if valid' })
  payment_details?: {
    amount: string;
    currency: string;
    description?: string;
    sender_name: string;
    expires_at: Date;
  };
}
