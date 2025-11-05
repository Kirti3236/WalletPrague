import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { AMLAlert } from '../../models/aml-alert.model';
import { BankStatement } from '../../models/bank-statement.model';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Transaction,
      User,
      Wallet,
      AMLAlert,
      BankStatement,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

