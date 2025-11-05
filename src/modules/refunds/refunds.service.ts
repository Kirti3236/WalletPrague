import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { RefundRequest, RefundStatus, RefundReason } from '../../models/refund-request.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import {
  CreateRefundRequestDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
  ListRefundRequestsDto,
} from './dto/refund.dto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(RefundRequest)
    private readonly refundRequestModel: typeof RefundRequest,
    @InjectModel(Transaction)
    private readonly transactionModel: typeof Transaction,
  ) {}

  /**
   * Create a refund request
   */
  async createRefundRequest(dto: CreateRefundRequestDto, userId: string) {
    // Validate transaction exists
    const transaction = await this.transactionModel.findByPk(dto.transaction_id);
    if (!transaction) {
      throw new NotFoundException(
        this.getTranslatedMessage('refunds.transaction_not_found'),
      );
    }

    // Validate refund amount does not exceed transaction amount
    if (dto.refund_amount > Number(transaction.amount)) {
      throw new BadRequestException(
        this.getTranslatedMessage('refunds.refund_not_allowed'),
      );
    }

    // Check if a refund already exists for this transaction
    const existingRefund = await this.refundRequestModel.findOne({
      where: {
        transaction_id: dto.transaction_id,
        status: [RefundStatus.PENDING, RefundStatus.APPROVED],
      },
    });

    if (existingRefund) {
      throw new BadRequestException(
        this.getTranslatedMessage('refunds.refund_not_allowed'),
      );
    }

    // Create refund request
    const refundRequest = await this.refundRequestModel.create({
      transaction_id: dto.transaction_id,
      user_id: transaction.sender_user_id || transaction.receiver_user_id || userId,
      requested_amount: Number(transaction.amount),
      refund_amount: dto.refund_amount,
      currency: transaction.currency || 'LPS',
      reason: dto.reason as RefundReason,
      description: dto.notes || '',
      status: RefundStatus.PENDING,
      requested_at: new Date(),
    } as any);

    return {
      message: this.getTranslatedMessage('refunds.refund_created'),
      refund_request: refundRequest,
    };
  }

  /**
   * List all refund requests
   */
  async listRefundRequests(dto: ListRefundRequestsDto) {
    const where: any = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.user_id) {
      where.user_id = dto.user_id;
    }

    const refundRequests = await this.refundRequestModel.findAll({
      where,
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'type', 'amount', 'created_at'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name'],
        },
      ],
      limit: dto.limit || 50,
      offset: dto.offset || 0,
      order: [['created_at', 'DESC']],
    });

    const total = await this.refundRequestModel.count({ where });

    return {
      total,
      refund_requests: refundRequests,
    };
  }

  /**
   * Get refund request by ID
   */
  async getRefundRequestById(id: string) {
    const refundRequest = await this.refundRequestModel.findByPk(id, {
      include: [
        {
          model: Transaction,
          as: 'transaction',
        },
        {
          model: User,
          as: 'user',
        },
      ],
    });

    if (!refundRequest) {
      throw new NotFoundException(
        this.getTranslatedMessage('refunds.transaction_not_found'),
      );
    }

    return refundRequest;
  }

  /**
   * Approve refund request
   */
  async approveRefundRequest(id: string, dto: ApproveRefundDto, userId: string) {
    const refundRequest = await this.refundRequestModel.findByPk(id);

    if (!refundRequest) {
      throw new NotFoundException(
        this.getTranslatedMessage('refunds.transaction_not_found'),
      );
    }

    if (refundRequest.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        this.getTranslatedMessage('refunds.refund_not_allowed'),
      );
    }

    await refundRequest.update({
      status: RefundStatus.APPROVED,
      approved_at: new Date(),
      admin_notes: dto.approval_notes,
    });

    return {
      message: this.getTranslatedMessage('refunds.refund_created'),
      refund_request: refundRequest,
    };
  }

  /**
   * Reject refund request
   */
  async rejectRefundRequest(id: string, dto: RejectRefundDto, userId: string) {
    const refundRequest = await this.refundRequestModel.findByPk(id);

    if (!refundRequest) {
      throw new NotFoundException(
        this.getTranslatedMessage('refunds.transaction_not_found'),
      );
    }

    if (refundRequest.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        this.getTranslatedMessage('refunds.refund_not_allowed'),
      );
    }

    await refundRequest.update({
      status: RefundStatus.REJECTED,
      rejected_at: new Date(),
      rejection_reason: dto.rejection_reason,
    });

    return {
      message: this.getTranslatedMessage('refunds.refund_created'),
      refund_request: refundRequest,
    };
  }

  /**
   * Process approved refund
   */
  async processRefund(id: string, dto: ProcessRefundDto, userId: string) {
    const refundRequest = await this.refundRequestModel.findByPk(id);

    if (!refundRequest) {
      throw new NotFoundException(
        this.getTranslatedMessage('refunds.transaction_not_found'),
      );
    }

    if (refundRequest.status !== RefundStatus.APPROVED) {
      throw new BadRequestException(
        this.getTranslatedMessage('refunds.refund_not_allowed'),
      );
    }

    // Process and complete the refund
    // In real implementation, this would call payment gateway
    // For now, just mark as completed
    await refundRequest.update({
      status: RefundStatus.COMPLETED,
      completed_at: new Date(),
    });

    return {
      message: this.getTranslatedMessage('refunds.refund_created'),
      refund_request: refundRequest,
    };
  }

  /**
   * Get refund processing log
   */
  async getProcessingLog(limit: number = 100, offset: number = 0) {
    const logs = await this.refundRequestModel.findAll({
      where: {
        status: [RefundStatus.COMPLETED, RefundStatus.FAILED],
      },
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: ['id', 'type', 'amount'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name'],
        },
      ],
      limit: Math.min(limit, 1000),
      offset,
      order: [['processed_at', 'DESC']],
    });

    const total = await this.refundRequestModel.count({
      where: {
        status: [RefundStatus.COMPLETED, RefundStatus.FAILED],
      },
    });

    return {
      total,
      logs,
    };
  }

  /**
   * Get translated message using i18n service with fallback
   */
  private getTranslatedMessage(
    key: string,
    lang: string = 'en',
    params?: any,
  ): string {
    try {
      return this.i18n.t(`messages.${key}`, { lang, args: params });
    } catch (error) {
      this.logger.warn(`Translation not found for key: ${key}, lang: ${lang}`);
      return key;
    }
  }
}
