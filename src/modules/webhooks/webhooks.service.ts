import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Webhook, WebhookEvent, WebhookStatus } from '../../models/webhook.model';
import { CreateWebhookDto, UpdateWebhookDto, ListWebhooksDto, RetryWebhookDto } from './dtos/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectModel(Webhook)
    private webhookModel: typeof Webhook,
    private readonly httpService: HttpService,
    private readonly i18n: I18nService,
  ) {}

  async createWebhook(dto: CreateWebhookDto): Promise<Webhook> {
    return this.webhookModel.create({
      url: dto.url,
      event_type: dto.event_type,
      payload: {},
      status: WebhookStatus.PENDING,
      attempts: 0,
    } as any);
  }

  async getAllWebhooks(dto: ListWebhooksDto): Promise<any> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (dto.event_type) {
      where.event_type = dto.event_type;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    const { count, rows } = await this.webhookModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      webhooks: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async getWebhookById(webhookId: string): Promise<Webhook> {
    const webhook = await this.webhookModel.findByPk(webhookId);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async updateWebhook(webhookId: string, dto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.webhookModel.findByPk(webhookId);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (dto.url !== undefined) {
      webhook.url = dto.url;
    }

    await webhook.save();
    return webhook;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const webhook = await this.webhookModel.findByPk(webhookId);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await webhook.destroy();
  }

  async retryWebhook(webhookId: string, dto: RetryWebhookDto): Promise<Webhook> {
    const webhook = await this.webhookModel.findByPk(webhookId);

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    if (webhook.status === WebhookStatus.SENT && !dto.force) {
      throw new BadRequestException('Webhook already sent successfully. Use force=true to retry.');
    }

    // Reset status for retry
    webhook.status = WebhookStatus.PENDING;
    webhook.next_retry_at = new Date();
    await webhook.save();

    // Trigger webhook delivery (in real implementation, this would be queued)
    try {
      await this.deliverWebhook(webhook);
    } catch (error) {
      this.logger.error(`Failed to deliver webhook ${webhookId}: ${error.message}`);
    }

    return webhook;
  }

  private async deliverWebhook(webhook: Webhook): Promise<void> {
    try {
      webhook.attempts += 1;
      webhook.last_attempt_at = new Date();

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, webhook.payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'YaPague-Webhook/1.0',
          },
          timeout: 10000,
        }),
      );

      webhook.status = WebhookStatus.SENT;
      webhook.response_code = (response as any).status;
      webhook.response_body = JSON.stringify((response as any).data);
      webhook.next_retry_at = null;

      await webhook.save();
    } catch (error) {
      webhook.status = WebhookStatus.FAILED;
      webhook.response_code = error.response?.status || null;
      webhook.response_body = error.message || null;

      // Schedule retry if attempts < max
      if (webhook.attempts < 5) {
        webhook.status = WebhookStatus.RETRYING;
        const retryDelay = Math.pow(2, webhook.attempts) * 60 * 1000; // Exponential backoff
        webhook.next_retry_at = new Date(Date.now() + retryDelay);
      }

      await webhook.save();
      throw error;
    }
  }

  async triggerWebhook(eventType: WebhookEvent, payload: any): Promise<void> {
    // Find all active webhooks for this event type
    const webhooks = await this.webhookModel.findAll({
      where: {
        event_type: eventType,
        status: { [Op.in]: [WebhookStatus.PENDING, WebhookStatus.RETRYING] },
      },
    });

    // Create webhook records for each URL
    for (const webhookConfig of webhooks) {
      const webhook = await this.webhookModel.create({
        url: webhookConfig.url,
        event_type: eventType,
        payload,
        status: WebhookStatus.PENDING,
        attempts: 0,
      } as any);

      // Deliver webhook asynchronously (in production, use a queue)
      this.deliverWebhook(webhook).catch((error) => {
        this.logger.error(`Failed to deliver webhook ${webhook.id}: ${error.message}`);
      });
    }
  }
}

