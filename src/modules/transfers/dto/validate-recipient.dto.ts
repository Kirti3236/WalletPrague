import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Input DTOs
export class ValidateRecipientDto {
  @ApiProperty({
    description: 'Recipient identifier (DNI or phone)',
    example: '0801199012345',
    required: false,
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Recipient DNI number (alternative to identifier)',
    example: '0801199012345',
  })
  @IsOptional()
  @IsString()
  recipient_dni?: string;

  @ApiPropertyOptional({ description: 'Sender user ID', example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  sender_user_id?: string;
}

export class TransferByDniDto {
  @ApiProperty({
    description: 'Recipient DNI number',
    example: '0801199012345',
  })
  @IsString()
  @IsNotEmpty()
  recipient_dni: string;

  @ApiProperty({ description: 'Transfer amount', example: 100.5 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Transfer description',
    example: 'Payment for services',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'LPS' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['LPS', 'USD'])
  currency?: string;

  @ApiPropertyOptional({ description: 'Sender user ID', example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  sender_user_id?: string;

  @ApiPropertyOptional({
    description: 'Sender wallet ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  sender_wallet_id?: string;
}

export class TransferConfirmationDto {
  @ApiProperty({
    description: 'Transaction ID to confirm',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  transaction_id: string;

  @ApiProperty({
    description: 'User ID for confirmation',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}

// Response DTOs
export class RecipientInfoDto {
  @ApiProperty({ description: 'Recipient user ID', example: 'uuid-here' })
  user_id: string;

  @ApiProperty({ description: 'Recipient full name', example: 'Juan Pérez' })
  full_name: string;

  @ApiProperty({ description: 'Recipient username', example: 'juanperez' })
  username: string;

  @ApiProperty({
    description: 'Recipient DNI number',
    example: '0801199012345',
  })
  dni_number: string;

  @ApiPropertyOptional({
    description: 'Recipient phone number',
    example: '+50412345678',
  })
  phone_number?: string;
}

export class WalletInfoDto {
  @ApiProperty({ description: 'Wallet ID', example: 'uuid-here' })
  wallet_id: string;

  @ApiProperty({ description: 'Wallet name', example: 'Main Wallet' })
  wallet_name: string;

  @ApiProperty({ description: 'Wallet type', example: 'personal' })
  wallet_type: string;

  @ApiProperty({ description: 'Currency', example: 'LPS' })
  currency: string;

  @ApiProperty({ description: 'Current balance', example: '1500.00' })
  balance: string;

  @ApiProperty({ description: 'Is wallet active', example: true })
  is_active: boolean;
}

export class TransferDetailsDto {
  @ApiProperty({ description: 'Transaction ID', example: 'uuid-here' })
  id: string;

  @ApiProperty({ description: 'Transaction type', example: 'p2p_payment' })
  type: string;

  @ApiProperty({ description: 'Transfer amount', example: '100.50' })
  amount: string;

  @ApiProperty({ description: 'Currency', example: 'LPS' })
  currency: string;

  @ApiProperty({ description: 'Transaction status', example: 'pending' })
  status: string;

  @ApiPropertyOptional({
    description: 'Transfer description',
    example: 'Payment for services',
  })
  description?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: string;
}

export class ValidateRecipientResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Is recipient valid', example: true })
  is_valid: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Recipient validated successfully',
  })
  message: string;

  @ApiPropertyOptional({ description: 'Recipient information' })
  recipient?: RecipientInfoDto;

  @ApiPropertyOptional({ description: 'Available wallets for transfer' })
  available_wallets?: WalletInfoDto[];
}

export class TransferConfirmationResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Transfer completed successfully',
  })
  message: string;

  @ApiProperty({ description: 'Transfer details' })
  transfer: TransferDetailsDto;
}
