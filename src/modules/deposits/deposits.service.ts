import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { I18nService } from 'nestjs-i18n';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Wallet } from '../../models/wallet.model';
import {
  PaymentMethod,
  PaymentMethodType,
} from '../../models/payment-method.model';
import { Ledger, LedgerEntryType } from '../../models/ledger.model';
import { FeePolicy } from '../../models/fee-policy.model';
import { assertLedgerBalanced } from '../common/ledger-balance.guard';
import { DepositFromCardDto, DepositFromBankDto } from './dto/deposit.dto';
// ✅ PHASE 2 IMPORTS
import { LimitValidationService } from '../common/services/limit-validation.service';
import { AccountingService } from '../common/services/accounting.service';
import { LimitExceededException } from '../../common/exceptions/app.exception';

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(PaymentMethod)
    private readonly paymentMethodModel: typeof PaymentMethod,
    private readonly sequelize: Sequelize,
    // ✅ PHASE 2 SERVICES
    private readonly limitValidationService: LimitValidationService,
    private readonly accountingService: AccountingService,
  ) {}

  async depositFromCard(dto: DepositFromCardDto) {
    return this.sequelize.transaction(async (tx) => {
      // Validate wallet belongs to user
      const wallet = await (Wallet as any).findByPk(dto.wallet_id, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!wallet || wallet.user_id !== dto.user_id) {
        throw new BadRequestException(
          this.getTranslatedMessage('deposits.wallet_not_found'),
        );
      }

      // Validate payment method belongs to user and is a card
      const paymentMethod = await this.paymentMethodModel.findOne({
        where: {
          id: dto.payment_method_id,
          user_id: dto.user_id,
          type: PaymentMethodType.CARD,
          is_active: true,
        },
        transaction: tx,
      });

      if (!paymentMethod) {
        throw new NotFoundException(
          this.getTranslatedMessage('deposits.wallet_not_found'),
        );
      }

      const amount =
        typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
      if (amount <= 0) {
        throw new BadRequestException(
          this.getTranslatedMessage('deposits.invalid_amount'),
        );
      }
      const amountString = amount.toFixed(2);

      // ✅ PHASE 2: Validate limits before deposit
      const limitCheck = await this.limitValidationService.validateTransaction(
        dto.user_id,
        amount,
      );
      
      if (!limitCheck.allowed) {
        throw new LimitExceededException(
          'Deposit Amount',
          amount,
          100000,
        );
      }

      // Get deposit fee policy (if any)
      const policy = await FeePolicy.findByPk('deposit_fee_card', {
        transaction: tx,
      });
      const feeFlat = parseFloat(
        (policy?.amount as unknown as string) || '0.00',
      );

      // Create transaction record
      const txn = await Transaction.create(
        {
          id: uuidv4(),
          receiver_wallet_id: dto.wallet_id,
          receiver_user_id: dto.user_id,
          type: TransactionType.DEPOSIT,
          amount: amountString,
          currency: dto.currency || 'LPS',
          fee_amount: feeFlat.toFixed(2),
          net_amount: (amount - feeFlat).toFixed(2),
          status: 'completed',
          description:
            dto.description || `Card deposit from *${paymentMethod.last4}`,
          processed_at: new Date(),
        } as any,
        { transaction: tx },
      );

      // Create ledger entry (credit to wallet)
      await Ledger.create(
        {
          id: uuidv4(),
          transaction_id: txn.id,
          wallet_id: dto.wallet_id,
          entry_type: LedgerEntryType.CREDIT,
          amount: amountString,
          currency: dto.currency || 'LPS',
          description: `Card deposit from *${paymentMethod.last4}`,
        } as any,
        { transaction: tx },
      );

      // ✅ PHASE 2: Create double-entry journal entries
      try {
        await this.accountingService.createJournalEntry(
          {
            journal_id: 'general',
            entry_date: new Date(),
            description: `Card deposit from *${paymentMethod.last4}`,
            debit_account_id: 'cash_account', // Placeholder
            credit_account_id: wallet.id,
            amount: amount,
            transaction_id: txn.id,
            transaction_type: 'CARD_DEPOSIT',
          },
          dto.user_id,
        );
      } catch (accountingError) {
        this.logger.warn(
          `Failed to create journal entry for deposit ${txn.id}: ${accountingError.message}`,
        );
      }

      // Update wallet balance
      const currentBalance = parseFloat(
        wallet.available_balance as unknown as string,
      );
      wallet.available_balance = (currentBalance + amount).toFixed(
        2,
      ) as unknown as string;
      wallet.ledger_balance = (currentBalance + amount).toFixed(
        2,
      ) as unknown as string;
      await wallet.save({ transaction: tx });

      // Verify ledger balance
      await assertLedgerBalanced(txn.id);

      return {
        transaction_id: txn.id,
        amount: txn.amount,
        currency: txn.currency,
        fee_amount: txn.fee_amount,
        net_amount: txn.net_amount,
        status: txn.status,
        payment_method: `*${paymentMethod.last4} (${paymentMethod.brand})`,
        processed_at: txn.processed_at,
        new_balance: wallet.available_balance,
      };
    });
  }

  async depositFromBank(dto: DepositFromBankDto) {
    return this.sequelize.transaction(async (tx) => {
      // Validate wallet belongs to user
      const wallet = await (Wallet as any).findByPk(dto.wallet_id, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!wallet || wallet.user_id !== dto.user_id) {
        throw new BadRequestException(
          this.getTranslatedMessage('deposits.wallet_not_found'),
        );
      }

      // Validate payment method belongs to user and is a bank account
      const paymentMethod = await this.paymentMethodModel.findOne({
        where: {
          id: dto.payment_method_id,
          user_id: dto.user_id,
          type: PaymentMethodType.BANK_ACCOUNT,
          is_active: true,
        },
        transaction: tx,
      });

      if (!paymentMethod) {
        throw new NotFoundException(
          this.getTranslatedMessage('deposits.wallet_not_found'),
        );
      }

      const amount =
        typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
      if (amount <= 0) {
        throw new BadRequestException(
          this.getTranslatedMessage('deposits.invalid_amount'),
        );
      }
      const amountString = amount.toFixed(2);

      // ✅ PHASE 2: Validate limits before deposit
      const limitCheck = await this.limitValidationService.validateTransaction(
        dto.user_id,
        amount,
      );
      
      if (!limitCheck.allowed) {
        throw new LimitExceededException(
          'Deposit Amount',
          amount,
          100000,
        );
      }

      // Get deposit fee policy (if any)
      const policy = await FeePolicy.findByPk('deposit_fee_bank', {
        transaction: tx,
      });
      const feeFlat = parseFloat(
        (policy?.amount as unknown as string) || '0.00',
      );

      // Create transaction record
      const txn = await Transaction.create(
        {
          id: uuidv4(),
          receiver_wallet_id: dto.wallet_id,
          receiver_user_id: dto.user_id,
          type: TransactionType.DEPOSIT,
          amount: amountString,
          currency: dto.currency || 'LPS',
          fee_amount: feeFlat.toFixed(2),
          net_amount: (amount - feeFlat).toFixed(2),
          status: 'completed',
          description:
            dto.description || `Bank deposit from ${paymentMethod.bank_name}`,
          processed_at: new Date(),
        } as any,
        { transaction: tx },
      );

      // Create ledger entry (credit to wallet)
      await Ledger.create(
        {
          id: uuidv4(),
          transaction_id: txn.id,
          wallet_id: dto.wallet_id,
          entry_type: LedgerEntryType.CREDIT,
          amount: amountString,
          currency: dto.currency || 'LPS',
          description: `Bank deposit from ${paymentMethod.bank_name}`,
        } as any,
        { transaction: tx },
      );

      // ✅ PHASE 2: Create double-entry journal entries
      try {
        await this.accountingService.createJournalEntry(
          {
            journal_id: 'general',
            entry_date: new Date(),
            description: `Bank deposit from ${paymentMethod.bank_name}`,
            debit_account_id: 'cash_account', // Placeholder
            credit_account_id: wallet.id,
            amount: amount,
            transaction_id: txn.id,
            transaction_type: 'BANK_DEPOSIT',
          },
          dto.user_id,
        );
      } catch (accountingError) {
        this.logger.warn(
          `Failed to create journal entry for bank deposit ${txn.id}: ${accountingError.message}`,
        );
      }

      // Update wallet balance
      const currentBalance = parseFloat(
        wallet.available_balance as unknown as string,
      );
      wallet.available_balance = (currentBalance + amount).toFixed(
        2,
      ) as unknown as string;
      wallet.ledger_balance = (currentBalance + amount).toFixed(
        2,
      ) as unknown as string;
      await wallet.save({ transaction: tx });

      // Verify ledger balance
      await assertLedgerBalanced(txn.id);

      return {
        transaction_id: txn.id,
        amount: txn.amount,
        currency: txn.currency,
        fee_amount: txn.fee_amount,
        net_amount: txn.net_amount,
        status: txn.status,
        payment_method: `${paymentMethod.bank_name} (${paymentMethod.account_type})`,
        processed_at: txn.processed_at,
        new_balance: wallet.available_balance,
      };
    });
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
