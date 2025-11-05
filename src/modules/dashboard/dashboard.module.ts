import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { AMLAlert } from '../../models/aml-alert.model';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SequelizeModule.forFeature([Transaction, User, Wallet, AMLAlert])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

