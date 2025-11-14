import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op, WhereOptions } from 'sequelize';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import {
  TransactionHistoryDto,
  TransactionSearchDto,
  TransactionHistoryResponseDto,
  TransactionItemDto,
  PaginationMetaDto,
  TransactionSummaryDto,
} from './dto/transaction-history.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    private readonly responseService: ResponseService,
  ) {}

  async getTransactionHistory(
    dto: TransactionHistoryDto,
    lang: string = 'en',
  ): Promise<TransactionHistoryResponseDto> {
    try {
      const {
        user_id,
        page = 1,
        limit = 20,
        type,
        start_date,
        end_date,
        min_amount,
        max_amount,
        currency,
      } = dto;

      // Verify user exists
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new NotFoundException(
          this.getTranslatedMessage('transactions.transaction_not_found'),
        );
      }

      // Build where conditions
      const whereConditions: WhereOptions = {
        [Op.or]: [{ sender_user_id: user_id }, { receiver_user_id: user_id }],
      };

      // Apply type filter
      if (type && type !== 'all') {
        const typeMapping = {
          payments: [TransactionType.P2P_PAYMENT, TransactionType.QR_PAYMENT],
          collections: [TransactionType.QR_PAYMENT], // When user is receiver
          deposits: [TransactionType.DEPOSIT],
          withdrawals: [TransactionType.WITHDRAWAL],
          transfers: [TransactionType.P2P_PAYMENT],
        };

        if (typeMapping[type]) {
          (whereConditions as any).type = { [Op.in]: typeMapping[type] };
        }
      }

      // Apply date range filter
      if (start_date || end_date) {
        const dateFilter: any = {};
        if (start_date) dateFilter[Op.gte] = new Date(start_date);
        if (end_date) dateFilter[Op.lte] = new Date(end_date);
        (whereConditions as any).created_at = dateFilter;
      }

      // Apply amount range filter
      if (min_amount || max_amount) {
        const amountFilter: any = {};
        if (min_amount) amountFilter[Op.gte] = parseFloat(min_amount);
        if (max_amount) amountFilter[Op.lte] = parseFloat(max_amount);
        (whereConditions as any).amount = amountFilter;
      }

      // Apply currency filter
      if (currency) {
        (whereConditions as any).currency = currency;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get transactions with pagination
      const { rows: transactions, count: totalItems } =
        await this.transactionModel.findAndCountAll({
          where: whereConditions,
          include: [
            {
              model: User,
              as: 'senderUser',
              attributes: [
                'id',
                'user_first_name',
                'user_last_name',
                'user_name',
              ],
              required: false,
            },
            {
              model: User,
              as: 'receiverUser',
              attributes: [
                'id',
                'user_first_name',
                'user_last_name',
                'user_name',
              ],
              required: false,
            },
          ],
          order: [['created_at', 'DESC']],
          limit,
          offset,
          distinct: true,
        });

      // Transform transactions
      const transformedTransactions = transactions.map((tx) =>
        this.transformTransaction(tx, user_id),
      );

      // Calculate summary
      const summary = await this.calculateTransactionSummary(
        whereConditions,
        user_id,
      );

      // Build pagination metadata
      const totalPages = Math.ceil(totalItems / limit);
      const pagination: PaginationMetaDto = {
        current_page: page,
        total_pages: totalPages,
        total_records: totalItems,
        per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1,
      };

      return {
        transactions: transformedTransactions,
        pagination,
        summary,
      };
    } catch (error) {
      this.logger.error(
        `Error getting transaction history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async searchTransactions(
    dto: TransactionSearchDto,
    lang: string = 'en',
  ): Promise<TransactionHistoryResponseDto> {
    try {
      const { user_id, query, amount, page = 1, limit = 20 } = dto;

      // Verify user exists
      const user = await this.userModel.findByPk(user_id);
      if (!user) {
        throw new NotFoundException(
          this.getTranslatedMessage('transactions.transaction_not_found'),
        );
      }

      // Build search conditions
      const whereConditions: WhereOptions = {
        [Op.or]: [{ sender_user_id: user_id }, { receiver_user_id: user_id }],
      };

      // Add search conditions
      const searchConditions: any[] = [];

      if (query && query.trim()) {
        searchConditions.push({
          description: {
            [Op.iLike]: `%${query.trim()}%`,
          },
        });
      }

      if (amount) {
        searchConditions.push({
          amount: parseFloat(amount),
        });
      }

      if (searchConditions.length > 0) {
        whereConditions[Op.and] = searchConditions;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get transactions
      const { rows: transactions, count: totalItems } =
        await this.transactionModel.findAndCountAll({
          where: whereConditions,
          include: [
            {
              model: User,
              as: 'senderUser',
              attributes: [
                'id',
                'user_first_name',
                'user_last_name',
                'user_name',
              ],
              required: false,
            },
            {
              model: User,
              as: 'receiverUser',
              attributes: [
                'id',
                'user_first_name',
                'user_last_name',
                'user_name',
              ],
              required: false,
            },
          ],
          order: [['created_at', 'DESC']],
          limit,
          offset,
          distinct: true,
        });

      // Transform transactions
      const transformedTransactions = transactions.map((tx) =>
        this.transformTransaction(tx, user_id),
      );

      // Calculate summary
      const summary = await this.calculateTransactionSummary(
        whereConditions,
        user_id,
      );

      // Build pagination metadata
      const totalPages = Math.ceil(totalItems / limit);
      const pagination: PaginationMetaDto = {
        current_page: page,
        total_pages: totalPages,
        total_records: totalItems,
        per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1,
      };

      return {
        transactions: transformedTransactions,
        pagination,
        summary,
      };
    } catch (error) {
      this.logger.error(
        `Error searching transactions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTransactionDetails(
    transactionId: string,
    userId: string,
    lang: string = 'en',
  ): Promise<any> {
    try {
      // Build where clause - admin can see any transaction
      const whereClause: any = { id: transactionId };
      if (userId !== 'admin') {
        whereClause[Op.or] = [
          { sender_user_id: userId },
          { receiver_user_id: userId },
        ];
      }

      // Find transaction
      const transaction = await this.transactionModel.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'senderUser',
            attributes: [
              'id',
              'user_first_name',
              'user_last_name',
              'user_name',
              'user_DNI_number',
            ],
            required: false,
          },
          {
            model: User,
            as: 'receiverUser',
            attributes: [
              'id',
              'user_first_name',
              'user_last_name',
              'user_name',
              'user_DNI_number',
            ],
            required: false,
          },
          {
            model: Wallet,
            as: 'senderWallet',
            attributes: ['id', 'wallet_name', 'currency'],
            required: false,
          },
          {
            model: Wallet,
            as: 'receiverWallet',
            attributes: ['id', 'wallet_name', 'currency'],
            required: false,
          },
        ],
      });

      if (!transaction) {
        throw new NotFoundException(
          this.getTranslatedMessage('transactions.transaction_not_found'),
        );
      }

      // Transform detailed transaction
      return this.transformDetailedTransaction(transaction, userId);
    } catch (error) {
      this.logger.error(
        `Error getting transaction details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private transformTransaction(
    transaction: Transaction,
    currentUserId: string,
  ): TransactionItemDto {
    const isOutgoing = transaction.sender_user_id === currentUserId;
    const otherUser = isOutgoing
      ? (transaction as any).receiverUser
      : (transaction as any).senderUser;

    let otherPartyName = 'Unknown';
    if (otherUser) {
      otherPartyName =
        `${otherUser.user_first_name} ${otherUser.user_last_name}`.trim() ||
        otherUser.user_name;
    }

    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      other_party: otherPartyName,
      direction: isOutgoing ? 'outgoing' : 'incoming',
      created_at: transaction.createdAt,
      processed_at: transaction.processed_at || undefined,
    };
  }

  private transformDetailedTransaction(
    transaction: Transaction,
    currentUserId: string,
  ): any {
    const isOutgoing = transaction.sender_user_id === currentUserId;

    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      fee_amount: transaction.fee_amount,
      net_amount: transaction.net_amount,
      status: transaction.status,
      description: transaction.description,
      direction: isOutgoing ? 'outgoing' : 'incoming',
      sender: (transaction as any).senderUser
        ? {
            id: (transaction as any).senderUser.id,
            name: `${(transaction as any).senderUser.user_first_name} ${(transaction as any).senderUser.user_last_name}`.trim(),
            username: (transaction as any).senderUser.user_name,
            dni: (transaction as any).senderUser.user_DNI_number,
          }
        : null,
      receiver: (transaction as any).receiverUser
        ? {
            id: (transaction as any).receiverUser.id,
            name: `${(transaction as any).receiverUser.user_first_name} ${(transaction as any).receiverUser.user_last_name}`.trim(),
            username: (transaction as any).receiverUser.user_name,
            dni: (transaction as any).receiverUser.user_DNI_number,
          }
        : null,
      sender_wallet: (transaction as any).senderWallet,
      receiver_wallet: (transaction as any).receiverWallet,
      payment_method: transaction.payment_method,
      gateway_reference: transaction.gateway_reference,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt,
      processed_at: transaction.processed_at,
    };
  }

  private async calculateTransactionSummary(
    whereConditions: WhereOptions,
    userId: string,
  ): Promise<TransactionSummaryDto> {
    // Get all transactions for summary
    const allTransactions = await this.transactionModel.findAll({
      where: whereConditions,
      attributes: ['amount', 'sender_user_id', 'receiver_user_id'],
    });

    let totalIncoming = 0;
    let totalOutgoing = 0;

    allTransactions.forEach((tx) => {
      const amount = parseFloat(tx.amount);
      if (tx.receiver_user_id === userId) {
        totalIncoming += amount;
      }
      if (tx.sender_user_id === userId) {
        totalOutgoing += amount;
      }
    });

    return {
      transaction_count: allTransactions.length,
      total_received: totalIncoming.toFixed(2),
      total_sent: totalOutgoing.toFixed(2),
      net_balance: (totalIncoming - totalOutgoing).toFixed(2),
    };
  }

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
