import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { Wallet } from '../../models/wallet.model';
import { TransactionCode, CommonStatus3 } from '../../models/transaction-code.model';
import { Ledger, LedgerEntryType } from '../../models/ledger.model';
import { Sequelize } from 'sequelize-typescript';
import { FeePolicy } from '../../models/fee-policy.model';
import { assertLedgerBalanced } from '../common/ledger-balance.guard';

function generateHumanCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${pick(4)}-${pick(4)}`;
}

@Injectable()
export class WithdrawalsService {
  constructor(private readonly sequelize: Sequelize) {}

  async generateWithdrawal(userId: string, walletId: string, amount: string, currency = 'LPS') {
    return this.sequelize.transaction(async (tx) => {
      const wallet = await (Wallet as any).findByPk(walletId, { transaction: tx, lock: tx.LOCK.UPDATE });
      if (!wallet || wallet.user_id !== userId) throw new BadRequestException('wallet_not_found');
      const amt = parseFloat(amount);
      if (amt <= 0) throw new BadRequestException('invalid_amount');
      const bal = parseFloat(wallet.available_balance as unknown as string);
      if (bal < amt) throw new BadRequestException('insufficient_funds');

      // fetch withdrawal fee policy
      const policy = await FeePolicy.findByPk('withdrawal_fee_flat', { transaction: tx });
      const feeFlat = parseFloat((policy?.amount as unknown as string) || '0.50');

      const txn = await Transaction.create(
        {
          id: uuidv4(),
          sender_wallet_id: walletId,
          sender_user_id: userId,
          type: TransactionType.WITHDRAWAL,
          amount,
          currency,
          fee_amount: feeFlat.toFixed(2),
          net_amount: (amt - feeFlat).toFixed(2),
          status: 'completed',
          description: 'Retiro de efectivo',
          processed_at: new Date(),
        } as any,
        { transaction: tx },
      );

      await Ledger.create(
        {
          id: uuidv4(),
          transaction_id: txn.id,
          wallet_id: walletId,
          entry_type: LedgerEntryType.DEBIT,
          amount,
          currency,
          description: 'Cash withdrawal',
        } as any,
        { transaction: tx },
      );

      // decrement balance
      wallet.available_balance = (bal - amt).toFixed(2) as unknown as string;
      await wallet.save({ transaction: tx });

      const code = await TransactionCode.create(
        {
          id: uuidv4(),
          transaction_id: txn.id,
          code: generateHumanCode(),
          amount,
          currency,
          status: CommonStatus3.ACTIVE,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        } as any,
        { transaction: tx },
      );

      await assertLedgerBalanced(txn.id);

      return {
        amount: txn.amount,
        currency: txn.currency,
        code: code.code,
        generated_at: txn.processed_at,
        expires_at: code.expires_at,
      };
    });
  }
}
