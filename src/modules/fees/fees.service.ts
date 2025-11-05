import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { Fee, FeeType } from '../../models/fee.model';
import { FeePolicy } from '../../models/fee-policy.model';
import { Transaction } from '../../models/transaction.model';
import { CreateFeePolicyDto, UpdateFeePolicyDto, ListFeesDto } from './dtos/fee.dto';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectModel(Fee)
    private feeModel: typeof Fee,
    @InjectModel(FeePolicy)
    private feePolicyModel: typeof FeePolicy,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    private readonly i18n: I18nService,
  ) {}

  async getUserFees(userId: string, dto: ListFeesDto): Promise<any> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Find all transactions for user
    const userTransactions = await this.transactionModel.findAll({
      where: {
        [Op.or]: [
          { sender_user_id: userId },
          { receiver_user_id: userId },
        ],
      },
      attributes: ['id'],
    });

    const transactionIds = userTransactions.map(t => t.id);

    if (transactionIds.length === 0) {
      return {
        fees: [],
        pagination: {
          total: 0,
          page,
          limit,
          total_pages: 0,
        },
      };
    }

    const where: any = {
      transaction_id: { [Op.in]: transactionIds },
    };

    if (dto.transaction_id) {
      where.transaction_id = dto.transaction_id;
    }

    if (dto.fee_type) {
      where.fee_type = dto.fee_type;
    }

    const { count, rows } = await this.feeModel.findAndCountAll({
      where,
      include: [
        {
          model: Transaction,
          attributes: ['id', 'type', 'amount', 'currency', 'description', 'createdAt'],
        },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      fees: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async getAllFeePolicies(): Promise<FeePolicy[]> {
    return this.feePolicyModel.findAll({
      order: [['code', 'ASC']],
    });
  }

  async createFeePolicy(dto: CreateFeePolicyDto): Promise<FeePolicy> {
    // Check if policy code already exists
    const existing = await this.feePolicyModel.findByPk(dto.code);
    if (existing) {
      throw new BadRequestException(`Fee policy with code '${dto.code}' already exists`);
    }

    return this.feePolicyModel.create({
      code: dto.code,
      amount: dto.amount.toString(),
      currency: dto.currency || 'HNL',
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      description: dto.description,
    } as any);
  }

  async updateFeePolicy(code: string, dto: UpdateFeePolicyDto): Promise<FeePolicy> {
    const policy = await this.feePolicyModel.findByPk(code);

    if (!policy) {
      throw new NotFoundException(`Fee policy with code '${code}' not found`);
    }

    if (dto.amount !== undefined) {
      policy.amount = dto.amount.toString();
    }
    if (dto.currency !== undefined) {
      policy.currency = dto.currency;
    }
    if (dto.is_active !== undefined) {
      policy.is_active = dto.is_active;
    }
    if (dto.description !== undefined) {
      policy.description = dto.description;
    }

    await policy.save();
    return policy;
  }

  async getFeePolicy(code: string): Promise<FeePolicy> {
    const policy = await this.feePolicyModel.findByPk(code);

    if (!policy) {
      throw new NotFoundException(`Fee policy with code '${code}' not found`);
    }

    return policy;
  }
}

