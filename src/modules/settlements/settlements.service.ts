import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { Settlement, SettlementStatus } from '../../models/settlement.model';
import { CreateSettlementDto, UpdateSettlementStatusDto, ListSettlementsDto } from './dtos/settlement.dto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    @InjectModel(Settlement)
    private settlementModel: typeof Settlement,
    private readonly i18n: I18nService,
  ) {}

  async createSettlement(dto: CreateSettlementDto): Promise<Settlement> {
    // Check if batch_id already exists
    const existing = await this.settlementModel.findOne({
      where: { batch_id: dto.batch_id },
    });

    if (existing) {
      throw new BadRequestException(`Settlement with batch_id '${dto.batch_id}' already exists`);
    }

    return this.settlementModel.create({
      batch_id: dto.batch_id,
      total_amount: dto.total_amount.toString(),
      currency: dto.currency,
      transaction_count: dto.transaction_count,
      settlement_date: new Date(dto.settlement_date),
      status: SettlementStatus.PENDING,
      gateway: dto.gateway,
      gateway_reference: dto.gateway_reference,
    } as any);
  }

  async getAllSettlements(dto: ListSettlementsDto): Promise<any> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.currency) {
      where.currency = dto.currency;
    }

    if (dto.from_date || dto.to_date) {
      where.settlement_date = {};
      if (dto.from_date) {
        where.settlement_date[Op.gte] = new Date(dto.from_date);
      }
      if (dto.to_date) {
        where.settlement_date[Op.lte] = new Date(dto.to_date);
      }
    }

    const { count, rows } = await this.settlementModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['settlement_date', 'DESC'], ['created_at', 'DESC']],
    });

    return {
      settlements: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async getSettlementById(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementModel.findByPk(settlementId);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  async updateSettlementStatus(
    settlementId: string,
    dto: UpdateSettlementStatusDto,
  ): Promise<Settlement> {
    const settlement = await this.settlementModel.findByPk(settlementId);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    settlement.status = dto.status;
    if (dto.gateway_reference) {
      settlement.gateway_reference = dto.gateway_reference;
    }
    if (dto.status === SettlementStatus.COMPLETED) {
      settlement.completed_at = new Date();
    }

    await settlement.save();
    return settlement;
  }
}

