import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { I18nService } from 'nestjs-i18n';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Wallet } from '../../models/wallet.model';
import { User, UserStatus } from '../../models/user.model';
import { Ledger, LedgerEntryType } from '../../models/ledger.model';
import { Fee, FeeType } from '../../models/fee.model';
import { Sequelize } from 'sequelize-typescript';
import { FeePolicy } from '../../models/fee-policy.model';
import { assertLedgerBalanced } from '../common/ledger-balance.guard';
import {
  ValidateRecipientDto,
  ValidateRecipientResponseDto,
  TransferByDniDto,
  TransferConfirmationDto,
  TransferConfirmationResponseDto,
} from './dto/validate-recipient.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';
// ✅ PHASE 2 IMPORTS
import { LimitValidationService } from '../common/services/limit-validation.service';
import { AccountingService } from '../common/services/accounting.service';
import { InsufficientBalanceException, LimitExceededException } from '../../common/exceptions/app.exception';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly i18n: I18nService,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Wallet)
    private walletModel: typeof Wallet,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    private readonly responseService: ResponseService,
    // ✅ PHASE 2 SERVICES
    private readonly limitValidationService: LimitValidationService,
    private readonly accountingService: AccountingService,
  ) {}

  async p2pByDni(
    senderUserId: string,
    senderWalletId: string,
    receiverUserId: string,
    receiverWalletId: string,
    amount: string | number,
    description?: string,
    currency = 'LPS',
  ) {
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    const policy = await FeePolicy.findByPk('transfer_fee_flat');
    const fixedFee = parseFloat(
      (policy?.amount as unknown as string) || '0.50',
    );
    
    // ✅ PHASE 2: Validate limits before transfer
    const limitCheck = await this.limitValidationService.validateTransaction(
      senderUserId,
      amountNum,
    );
    
    if (!limitCheck.allowed) {
      throw new LimitExceededException(
        'Transfer Amount',
        amountNum,
        100000, // Max transfer limit
      );
    }

    return this.sequelize.transaction(async (tx) => {
      const senderWallet = await (Wallet as any).findByPk(senderWalletId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      const receiverWallet = await (Wallet as any).findByPk(receiverWalletId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!senderWallet || !receiverWallet) {
        throw new BadRequestException(
          this.getTranslatedMessage('transfers.wallet_not_found'),
        );
      }
      const amt = amountNum;
      const senderBal = parseFloat(
        senderWallet.available_balance as unknown as string,
      );
      if (senderBal < amt) {
        // ✅ PHASE 2: Use standardized exception
        throw new InsufficientBalanceException(
          senderBal,
          amt,
        );
      }

      const txn = await (Transaction as any).create(
        {
          id: uuidv4(),
          sender_wallet_id: senderWalletId,
          receiver_wallet_id: receiverWalletId,
          sender_user_id: senderUserId,
          receiver_user_id: receiverUserId,
          type: TransactionType.P2P_PAYMENT,
          amount: amt.toFixed(2),
          currency,
          fee_amount: fixedFee.toFixed(2),
          net_amount: (amt - fixedFee).toFixed(2),
          status: 'completed',
          description: description ?? 'Transferencia P2P',
          processed_at: new Date(),
        } as any,
        { transaction: tx },
      );

      await (Fee as any).create(
        {
          id: uuidv4(),
          transaction_id: txn.id,
          fee_type: FeeType.TRANSFER_FEE,
          fee_amount: fixedFee.toFixed(2),
          currency,
          fee_percentage: '0.0000',
        } as any,
        { transaction: tx },
      );

      await (Ledger as any).bulkCreate(
        [
          {
            id: uuidv4(),
            transaction_id: txn.id,
            wallet_id: senderWallet.id,
            entry_type: LedgerEntryType.DEBIT,
            amount,
            currency,
            description: 'P2P transfer sent',
          } as any,
          {
            id: uuidv4(),
            transaction_id: txn.id,
            wallet_id: receiverWallet.id,
            entry_type: LedgerEntryType.CREDIT,
            amount,
            currency,
            description: 'P2P transfer received',
          } as any,
        ],
        { transaction: tx },
      );

      // ✅ PHASE 2: Create double-entry journal entries
      try {
        await this.accountingService.createJournalEntry(
          {
            journal_id: 'general', // Use general journal
            entry_date: new Date(),
            description: `P2P Transfer: ${description || 'Transferencia P2P'}`,
            debit_account_id: senderWallet.id,
            credit_account_id: receiverWallet.id,
            amount: amountNum,
            transaction_id: txn.id,
            transaction_type: 'P2P_TRANSFER',
          },
          senderUserId,
        );
      } catch (accountingError) {
        this.logger.warn(
          `Failed to create journal entry for transaction ${txn.id}: ${accountingError.message}`,
        );
      }

      // Update balances
      senderWallet.available_balance = (senderBal - amt).toFixed(
        2,
      ) as unknown as string;
      const receiverBal = parseFloat(
        receiverWallet.available_balance as unknown as string,
      );
      receiverWallet.available_balance = (receiverBal + amt).toFixed(
        2,
      ) as unknown as string;
      await senderWallet.save({ transaction: tx });
      await receiverWallet.save({ transaction: tx });

      await assertLedgerBalanced(txn.id);

      return {
        transaction_id: txn.id,
        amount: txn.amount,
        currency: txn.currency,
        fee_amount: txn.fee_amount,
        status: txn.status,
        processed_at: txn.processed_at,
      };
    });
  }

  async validateRecipient(
    dto: ValidateRecipientDto,
    lang: string = 'en',
  ): Promise<ValidateRecipientResponseDto> {
    try {
      const { identifier, recipient_dni, sender_user_id } = dto;
      // Use identifier as the primary field, fallback to recipient_dni for backward compatibility
      const recipientDni = identifier || recipient_dni;

      // Check if sender exists
      const sender = await this.userModel.findByPk(sender_user_id);
      if (!sender) {
        throw new NotFoundException(
          this.getTranslatedMessage('transfers.sender_not_found', lang),
        );
      }

      // Check if trying to send to self
      if (sender.user_DNI_number === recipientDni) {
        return {
          success: false,
          is_valid: false,
          message: this.getTranslatedMessage(
            'transfers.self_transfer_not_allowed',
            lang,
          ),
        };
      }

      // Find recipient by DNI
      const recipient = await this.userModel.findOne({
        where: { user_DNI_number: recipientDni },
      });

      if (!recipient) {
        return {
          success: false,
          is_valid: false,
          message: this.getTranslatedMessage(
            'transfers.recipient_not_found',
            lang,
          ),
        };
      }

      // Check recipient status
      if (recipient.user_status !== UserStatus.ACTIVE) {
        return {
          success: false,
          is_valid: false,
          message: this.getTranslatedMessage(
            'transfers.recipient_inactive',
            lang,
          ),
        };
      }

      // Get recipient's active wallets
      const wallets = await this.walletModel.findAll({
        where: {
          user_id: recipient.id,
          status: 'active',
        },
        attributes: ['id', 'wallet_name', 'currency', 'status'],
      });

      if (wallets.length === 0) {
        return {
          success: false,
          is_valid: false,
          message: this.getTranslatedMessage(
            'transfers.no_active_wallets',
            lang,
          ),
        };
      }

      return {
        success: true,
        is_valid: true,
        message: this.getTranslatedMessage(
          'transfers.recipient_validated',
          lang,
        ),
        recipient: {
          user_id: recipient.id,
          full_name:
            `${recipient.user_first_name} ${recipient.user_last_name}`.trim(),
          username: recipient.user_name,
          dni_number: recipient.user_DNI_number,
          phone_number: recipient.user_phone_number,
        },
        available_wallets: wallets.map((wallet) => ({
          wallet_id: wallet.id,
          wallet_name: wallet.wallet_name || `${wallet.currency} Wallet`,
          wallet_type: 'personal',
          currency: wallet.currency,
          balance: '0.00',
          is_active: wallet.status === 'active',
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error validating recipient: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async transferByDni(
    dto: TransferByDniDto,
    lang: string = 'en',
  ): Promise<any> {
    try {
      const {
        sender_user_id,
        sender_wallet_id,
        recipient_dni,
        amount,
        description,
        currency = 'LPS',
      } = dto;

      // First validate recipient
      const recipientValidation = await this.validateRecipient(
        {
          identifier: recipient_dni,
          recipient_dni,
          sender_user_id,
        },
        lang,
      );

      if (!recipientValidation.is_valid) {
        throw new BadRequestException(
          this.getTranslatedMessage(
            'transfers.recipient_validation_failed',
            lang,
          ),
        );
      }

      // Find recipient's wallet for the specified currency
      const recipientWallet = recipientValidation.available_wallets?.find(
        (w) => w.currency === currency,
      );
      if (!recipientWallet) {
        throw new BadRequestException(
          this.getTranslatedMessage('transfers.no_wallet_for_currency', lang, {
            currency,
          }),
        );
      }

      // Use existing P2P transfer logic
      return await this.p2pByDni(
        sender_user_id!,
        sender_wallet_id!,
        recipientValidation.recipient!.user_id,
        recipientWallet.wallet_id,
        amount.toString(),
        description,
        currency,
      );
    } catch (error) {
      this.logger.error(
        `Error in transfer by DNI: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTransferConfirmation(
    dto: TransferConfirmationDto,
    lang: string = 'en',
  ): Promise<TransferConfirmationResponseDto> {
    try {
      const { transaction_id, user_id } = dto;

      // Find the transaction
      const transaction = await this.transactionModel.findOne({
        where: {
          id: transaction_id,
          [Op.or]: [{ sender_user_id: user_id }, { receiver_user_id: user_id }],
        },
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
          this.getTranslatedMessage('transfers.transfer_not_found', lang),
        );
      }

      return {
        success: true,
        message: this.getTranslatedMessage(
          'transfers.transfer_details_retrieved',
          lang,
        ),
        transfer: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          description: transaction.description,
          created_at:
            transaction.createdAt?.toISOString() || new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting transfer confirmation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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
      return key; // Fallback to key if translation fails
    }
  }
}
