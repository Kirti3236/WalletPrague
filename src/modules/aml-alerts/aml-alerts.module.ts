import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AMLAlert } from '../../models/aml-alert.model';
import { AMLAlertsController } from './aml-alerts.controller';
import { UserAMLStatusController } from './user-aml-status.controller';
import { AMLAlertsService } from './aml-alerts.service';

@Module({
  imports: [SequelizeModule.forFeature([AMLAlert])],
  controllers: [AMLAlertsController, UserAMLStatusController],
  providers: [AMLAlertsService],
  exports: [AMLAlertsService],
})
export class AMLAlertsModule {}

