import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HttpModule } from '@nestjs/axios';
import { Webhook } from '../../models/webhook.model';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Webhook,
    ]),
    HttpModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, ResponseService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

