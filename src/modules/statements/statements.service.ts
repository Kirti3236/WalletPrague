import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { GeneralLedger } from '../../models/general-ledger.model';
import { ChartOfAccounts } from '../../models/chart-of-accounts.model';
import { Transaction } from '../../models/transaction.model';

@Injectable()
export class StatementsService {
  private readonly logger = new Logger(StatementsService.name);

  constructor(
    @InjectModel(GeneralLedger)
    private ledgerModel: typeof GeneralLedger,
    @InjectModel(ChartOfAccounts)
    private accountModel: typeof ChartOfAccounts,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
  ) {}

  async getStatementHistory(userId: string) {
    try {
      // Get unique dates from transactions where user is sender or receiver
      const transactions = await this.transactionModel.findAll({
        where: {
          [Op.or]: [
            { sender_user_id: userId },
            { receiver_user_id: userId },
          ],
        },
        attributes: ['createdAt'],
        raw: true,
      });

      // Extract unique dates and format them
      const uniqueDates = new Set<string>();
      transactions.forEach((t: any) => {
        if (t.createdAt) {
          const date = new Date(t.createdAt);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          uniqueDates.add(dateStr);
        }
      });

      const periods = Array.from(uniqueDates).sort().reverse();
      
      return {
        success: true,
        data: {
          periods,
          total_periods: periods.length,
        },
        message: 'Statement history retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error getting statement history: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve statement history');
    }
  }

  async getStatement(userId: string, period: string) {
    try {
      const startDate = new Date(period);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Get transactions for the user in the specified period
      const transactions = await this.transactionModel.findAll({
        where: {
          [Op.or]: [
            { sender_user_id: userId },
            { receiver_user_id: userId },
          ],
          createdAt: { [Op.between]: [startDate, endDate] },
        },
        order: [['createdAt', 'ASC']],
      });

      let runningBalance = 0;
      const entries = transactions.map((tx: any) => {
        const isIncoming = tx.receiver_user_id === userId;
        const amount = parseFloat(tx.amount);
        
        if (isIncoming) {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }

        return {
          date: tx.createdAt,
          description: tx.description || `${tx.type} transaction`,
          amount: amount.toFixed(2),
          type: isIncoming ? 'credit' : 'debit',
          balance: runningBalance.toFixed(2),
          transaction_id: tx.id,
          transaction_type: tx.type,
        };
      });

      const periodBalance = runningBalance;

      return {
        success: true,
        data: {
          period,
          entries,
          period_balance: periodBalance.toFixed(2),
          total_transactions: transactions.length,
          generated_at: new Date(),
        },
        message: 'Statement retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error getting statement: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve statement');
    }
  }

  async exportStatementAsCSV(userId: string, period: string): Promise<string> {
    try {
      const statement = await this.getStatement(userId, period);
      const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
      const rows = statement.data.entries.map((e: any) => [
        e.date,
        e.description,
        e.type === 'debit' ? e.amount : '',
        e.type === 'credit' ? e.amount : '',
        e.balance,
      ]);
      
      return [
        headers.join(','),
        ...rows.map((r: any) => r.join(',')),
        `Total,,,${statement.data.period_balance}`,
      ].join('\n');
    } catch (error) {
      this.logger.error(`Error exporting statement as CSV: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to export statement as CSV');
    }
  }

  async exportStatementAsJSON(userId: string, period: string) {
    return this.getStatement(userId, period);
  }
}
