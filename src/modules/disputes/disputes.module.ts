import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Dispute } from '../../models/dispute.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { DisputeStatusCatalog } from '../../models/dispute-status.model';
import { DisputesService } from './disputes.service';
import { UserDisputesController, AdminDisputesController } from './disputes.controller';
import { ResponseService } from '../../common/services/response.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Dispute,
      Transaction,
      User,
      DisputeStatusCatalog,
    ]),
  ],
  controllers: [UserDisputesController, AdminDisputesController],
  providers: [DisputesService, ResponseService],
  exports: [DisputesService],
})
export class DisputesModule {}

