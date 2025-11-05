import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BankStatement, BankStatementLine } from '../../models/bank-statement.model';
import { Transaction } from '../../models/transaction.model';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [
    SequelizeModule.forFeature([BankStatement, BankStatementLine, Transaction]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
