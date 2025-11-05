import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateLimitPolicyDto {
  @IsString()
  policy_code: string;

  @IsString()
  policy_name: string;

  @IsNumber()
  @Min(0.01)
  max_transaction_amount: number;

  @IsNumber()
  @Min(0.01)
  max_daily_amount: number;

  @IsNumber()
  @Min(0.01)
  max_monthly_amount: number;

  @IsNumber()
  @Min(1)
  max_daily_count: number;

  @IsNumber()
  @Min(1)
  max_monthly_count: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLimitPolicyDto {
  @IsOptional()
  @IsString()
  policy_name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  max_transaction_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  max_daily_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  max_monthly_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_daily_count?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_monthly_count?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignPolicyDto {
  @IsString()
  policy_code: string;
}

export class CheckLimitDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
