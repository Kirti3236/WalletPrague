import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { QrCode } from '../../models/qr-code.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([QrCode, Transaction, User, Wallet]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, ResponseService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
