import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl, IsObject } from 'class-validator';
import { WebhookEvent, WebhookStatus } from '../../../models/webhook.model';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook URL', example: 'https://example.com/webhook' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Event type', enum: WebhookEvent, example: WebhookEvent.TRANSACTION_COMPLETED })
  @IsEnum(WebhookEvent)
  @IsNotEmpty()
  event_type: WebhookEvent;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsOptional()
  is_active?: boolean;
}

export class RetryWebhookDto {
  @ApiPropertyOptional({ description: 'Force retry even if not failed' })
  @IsOptional()
  force?: boolean;
}

export class ListWebhooksDto {
  @ApiPropertyOptional({ description: 'Filter by event type', enum: WebhookEvent })
  @IsEnum(WebhookEvent)
  @IsOptional()
  event_type?: WebhookEvent;

  @ApiPropertyOptional({ description: 'Filter by status', enum: WebhookStatus })
  @IsEnum(WebhookStatus)
  @IsOptional()
  status?: WebhookStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}


