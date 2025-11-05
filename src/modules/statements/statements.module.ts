import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { GeneralLedger } from '../../models/general-ledger.model';
import { ChartOfAccounts } from '../../models/chart-of-accounts.model';
import { Transaction } from '../../models/transaction.model';
import { StatementsService } from './statements.service';
import { StatementsController } from './statements.controller';

@Module({
  imports: [SequelizeModule.forFeature([GeneralLedger, ChartOfAccounts, Transaction])],
  providers: [StatementsService],
  controllers: [StatementsController],
  exports: [StatementsService],
})
export class StatementsModule {}
