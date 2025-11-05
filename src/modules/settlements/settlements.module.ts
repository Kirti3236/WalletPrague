import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Settlement } from '../../models/settlement.model';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Settlement,
    ]),
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService, ResponseService],
  exports: [SettlementsService],
})
export class SettlementsModule {}

