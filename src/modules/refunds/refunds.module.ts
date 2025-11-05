import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RefundRequest } from '../../models/refund-request.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [
    SequelizeModule.forFeature([RefundRequest, Transaction, User]),
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
