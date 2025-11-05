import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { ResponseService } from '../../common/services/response.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, User, Wallet]),
    CommonModule,
  ],
  controllers: [TransfersController],
  providers: [TransfersService, ResponseService],
  exports: [TransfersService],
})
export class TransfersModule {}
