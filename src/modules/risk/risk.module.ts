import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../../models/user.model';
import { Transaction } from '../../models/transaction.model';
import { UserLimit } from '../../models/user-limit.model';
import { LimitCounterDaily } from '../../models/limit-counter-daily.model';
import { LimitCounterMonthly } from '../../models/limit-counter-monthly.model';
import { Restriction } from '../../models/restriction.model';
import { AMLAlert } from '../../models/aml-alert.model';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User,
      Transaction,
      UserLimit,
      LimitCounterDaily,
      LimitCounterMonthly,
      Restriction,
      AMLAlert,
    ]),
  ],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}

