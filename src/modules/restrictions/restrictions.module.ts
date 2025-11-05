import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Restriction } from '../../models/restriction.model';
import { RestrictionsService } from './restrictions.service';
import { RestrictionsController } from './restrictions.controller';

@Module({
  imports: [SequelizeModule.forFeature([Restriction])],
  providers: [RestrictionsService],
  controllers: [RestrictionsController],
  exports: [RestrictionsService],
})
export class RestrictionsModule {}
