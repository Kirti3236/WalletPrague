import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { UserRole } from '../../models/user.model';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto, ListWebhooksDto, RetryWebhookDto } from './dtos/webhook.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('🔔 Webhooks')
@Controller('private/admin/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * POST /v1/private/admin/webhooks - Register webhook URL
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register webhook URL',
    description: 'Admin: Register a webhook URL for event notifications',
  })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  async createWebhook(@Body() dto: CreateWebhookDto, @Lang() lang?: string) {
    const webhook = await this.webhooksService.createWebhook(dto);
    return this.responseService.success(webhook, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/webhooks - List all webhooks
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all webhooks',
    description: 'Admin: Get list of all registered webhooks',
  })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async getAllWebhooks(@Query() query: ListWebhooksDto, @Lang() lang?: string) {
    const result = await this.webhooksService.getAllWebhooks(query);
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/webhooks/:id - Get webhook details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get webhook details',
    description: 'Admin: Get details of a specific webhook',
  })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhookById(@Param('id') webhookId: string, @Lang() lang?: string) {
    const webhook = await this.webhooksService.getWebhookById(webhookId);
    return this.responseService.success(webhook, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * PUT /v1/private/admin/webhooks/:id - Update webhook
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update webhook',
    description: 'Admin: Update webhook URL or settings',
  })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Param('id') webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @Lang() lang?: string,
  ) {
    const webhook = await this.webhooksService.updateWebhook(webhookId, dto);
    return this.responseService.success(webhook, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * DELETE /v1/private/admin/webhooks/:id - Delete webhook
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete webhook',
    description: 'Admin: Delete a webhook',
  })
  @ApiResponse({ status: 204, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') webhookId: string, @Lang() lang?: string) {
    await this.webhooksService.deleteWebhook(webhookId);
    return this.responseService.success({ message: 'Webhook deleted successfully' }, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * POST /v1/private/admin/webhooks/:id/retry - Retry failed webhook
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed webhook',
    description: 'Admin: Retry delivery of a failed webhook',
  })
  @ApiResponse({ status: 200, description: 'Webhook retry initiated' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async retryWebhook(
    @Param('id') webhookId: string,
    @Body() dto: RetryWebhookDto,
    @Lang() lang?: string,
  ) {
    const webhook = await this.webhooksService.retryWebhook(webhookId, dto);
    return this.responseService.success(webhook, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/webhooks/logs - Get webhook delivery logs
   */
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get webhook delivery logs',
    description: 'Admin: Get webhook delivery logs with filters',
  })
  @ApiResponse({ status: 200, description: 'Webhook logs' })
  async getWebhookLogs(@Query() query: ListWebhooksDto, @Lang() lang?: string) {
    const result = await this.webhooksService.getAllWebhooks(query);
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }
}

