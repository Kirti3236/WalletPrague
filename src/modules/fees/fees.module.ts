import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Fee } from '../../models/fee.model';
import { FeePolicy } from '../../models/fee-policy.model';
import { Transaction } from '../../models/transaction.model';
import { FeesService } from './fees.service';
import { UserFeesController, AdminFeesController } from './fees.controller';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Fee,
      FeePolicy,
      Transaction,
    ]),
  ],
  controllers: [UserFeesController, AdminFeesController],
  providers: [FeesService, ResponseService],
  exports: [FeesService],
})
export class FeesModule {}

