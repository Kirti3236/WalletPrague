import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TransactionsController, AdminTransactionsController } from './transactions.controller';
import { TransactionStatusController, AdminTransactionStatusController } from './transactions-status.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { TxnStatus } from '../../models/txn-status.model';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [SequelizeModule.forFeature([Transaction, User, Wallet, TxnStatus])],
  controllers: [TransactionsController, AdminTransactionsController, TransactionStatusController, AdminTransactionStatusController],
  providers: [TransactionsService, ResponseService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
