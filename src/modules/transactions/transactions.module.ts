import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, User, Wallet]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, ResponseService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
