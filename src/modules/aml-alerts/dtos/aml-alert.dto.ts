import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  AlertType,
  AlertSeverity,
  AlertStatus,
  ResolutionType,
} from '../../../models/aml-alert.model';

export class ListAMLAlertsDto {
  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ enum: AlertType })
  @IsOptional()
  @IsEnum(AlertType)
  alert_type?: AlertType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsString()
  end_date?: string;
}

export class ReviewAMLAlertDto {
  @ApiProperty({ description: 'Review notes' })
  @IsString()
  review_notes: string;
}

export class ResolveAMLAlertDto {
  @ApiProperty({ enum: ResolutionType, description: 'Type of resolution' })
  @IsEnum(ResolutionType)
  resolution_type: ResolutionType;

  @ApiProperty({ description: 'Resolution notes' })
  @IsString()
  resolution_notes: string;

  @ApiPropertyOptional({ description: 'Whether to escalate to authorities' })
  @IsOptional()
  @IsBoolean()
  escalate?: boolean;

  @ApiPropertyOptional({ description: 'External reference number' })
  @IsOptional()
  @IsString()
  external_reference?: string;
}

