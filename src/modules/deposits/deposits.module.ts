import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';
import { PaymentMethod } from '../../models/payment-method.model';

@Module({
  imports: [SequelizeModule.forFeature([PaymentMethod])],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
