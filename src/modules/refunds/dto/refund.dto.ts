import { IsString, IsNumber, IsOptional, IsEnum, IsUUID, Min, Max } from 'class-validator';

export enum RefundReason {
  DUPLICATE_TRANSACTION = 'duplicate_transaction',
  INCORRECT_AMOUNT = 'incorrect_amount',
  UNAUTHORIZED_TRANSACTION = 'unauthorized_transaction',
  MERCHANT_ERROR = 'merchant_error',
  CUSTOMER_REQUEST = 'customer_request',
  CANCELLED_ORDER = 'cancelled_order',
  TECHNICAL_ERROR = 'technical_error',
  OTHER = 'other',
}

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateRefundRequestDto {
  @IsUUID()
  transaction_id: string;

  @IsNumber()
  @Min(0.01)
  refund_amount: number;

  @IsEnum(RefundReason)
  reason: RefundReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  approval_notes?: string;
}

export class RejectRefundDto {
  @IsString()
  rejection_reason: string;
}

export class ProcessRefundDto {
  @IsOptional()
  @IsString()
  processing_method?: string;
}

export class ListRefundRequestsDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
