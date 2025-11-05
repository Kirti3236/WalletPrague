import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';
import { PaymentMethod } from '../../models/payment-method.model';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    SequelizeModule.forFeature([PaymentMethod]),
    CommonModule,
  ],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
