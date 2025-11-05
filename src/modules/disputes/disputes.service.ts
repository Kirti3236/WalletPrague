import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { Dispute, DisputeType } from '../../models/dispute.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { DisputeStatusCatalog } from '../../models/dispute-status.model';
import { CreateDisputeDto, UpdateDisputeStatusDto, ListDisputesDto } from './dtos/dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectModel(Dispute)
    private disputeModel: typeof Dispute,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(DisputeStatusCatalog)
    private disputeStatusCatalogModel: typeof DisputeStatusCatalog,
    private readonly i18n: I18nService,
  ) {}

  async createDispute(userId: string, dto: CreateDisputeDto): Promise<Dispute> {
    // Verify transaction exists and belongs to user
    const transaction = await this.transactionModel.findOne({
      where: {
        id: dto.transaction_id,
        [Op.or]: [
          { sender_user_id: userId },
          { receiver_user_id: userId },
        ],
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found or access denied');
    }

    // Check if dispute already exists for this transaction
    const existingDispute = await this.disputeModel.findOne({
      where: {
        transaction_id: dto.transaction_id,
        user_id: userId,
        status: { [Op.not]: 'resolved' },
      },
    });

    if (existingDispute) {
      throw new BadRequestException('A dispute already exists for this transaction');
    }

    // Create dispute
    const dispute = await this.disputeModel.create({
      transaction_id: dto.transaction_id,
      user_id: userId,
      dispute_type: dto.dispute_type,
      status: 'initiated',
      amount: transaction.amount,
      currency: transaction.currency,
      reason: dto.reason,
    } as any);

    return dispute;
  }

  async getUserDisputes(userId: string, dto: ListDisputesDto): Promise<any> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    const where: any = {
      user_id: userId,
    };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.dispute_type) {
      where.dispute_type = dto.dispute_type;
    }

    if (dto.transaction_id) {
      where.transaction_id = dto.transaction_id;
    }

    const { count, rows } = await this.disputeModel.findAndCountAll({
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
      disputes: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async getAllDisputes(dto: ListDisputesDto): Promise<any> {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (dto.user_id) {
      where.user_id = dto.user_id;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.dispute_type) {
      where.dispute_type = dto.dispute_type;
    }

    if (dto.transaction_id) {
      where.transaction_id = dto.transaction_id;
    }

    const { count, rows } = await this.disputeModel.findAndCountAll({
      where,
      include: [
        {
          model: Transaction,
          attributes: ['id', 'type', 'amount', 'currency', 'description', 'createdAt'],
        },
        {
          model: User,
          attributes: ['id', 'user_name', 'user_first_name', 'user_last_name'],
        },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return {
      disputes: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
  }

  async getDisputeById(disputeId: string, userId?: string): Promise<Dispute> {
    const where: any = { id: disputeId };

    // If userId provided, ensure user owns the dispute (for user endpoints)
    if (userId) {
      where.user_id = userId;
    }

    const dispute = await this.disputeModel.findOne({
      where,
      include: [
        {
          model: Transaction,
          attributes: ['id', 'type', 'amount', 'currency', 'description', 'createdAt'],
        },
        {
          model: User,
          attributes: ['id', 'user_name', 'user_first_name', 'user_last_name'],
        },
      ],
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async updateDisputeStatus(
    disputeId: string,
    adminId: string,
    dto: UpdateDisputeStatusDto,
  ): Promise<Dispute> {
    const dispute = await this.disputeModel.findByPk(disputeId);

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify status exists in catalog
    const statusExists = await this.disputeStatusCatalogModel.findByPk(dto.status);
    if (!statusExists) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    // Update dispute
    dispute.status = dto.status;
    if (dto.resolution) {
      dispute.resolution = dto.resolution;
    }
    if (dto.status === 'resolved') {
      dispute.resolved_at = new Date();
    }

    await dispute.save();

    return dispute;
  }
}

