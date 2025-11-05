import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GeneralLedger } from '../../../models/general-ledger.model';
import { ChartOfAccounts } from '../../../models/chart-of-accounts.model';
import { TransactionException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';

export interface TrialBalanceRow {
  accountNumber: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
}

export interface LedgerExportData {
  format: 'csv' | 'json' | 'pdf';
  fileName: string;
  content: string | Buffer;
  mimeType: string;
}

/**
 * Ledger Export Service
 * Generates various reports and exports from the general ledger
 */
@Injectable()
export class LedgerExportService {
  private readonly logger = new Logger('LedgerExportService');

  constructor(
    @InjectModel(GeneralLedger)
    private generalLedgerModel: typeof GeneralLedger,
    @InjectModel(ChartOfAccounts)
    private chartOfAccountsModel: typeof ChartOfAccounts,
  ) {}

  /**
   * Generate trial balance for a period
   */
  async generateTrialBalance(
    startDate: Date,
    endDate: Date,
  ): Promise<TrialBalanceRow[]> {
    // Get all accounts
    const accounts = await this.chartOfAccountsModel.findAll({
      where: { is_active: true },
      order: [['account_number', 'ASC']],
    });

    // Calculate balance for each account within period
    const trialBalance: TrialBalanceRow[] = [];

    for (const account of accounts) {
      const entries = await this.generalLedgerModel.findAll({
        where: {
          account_id: account.id,
          entry_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      });

      let debitAmount = 0;
      let creditAmount = 0;

      for (const entry of entries) {
        if (entry.entry_type === 'debit') {
          debitAmount += parseFloat(entry.amount.toString());
        } else {
          creditAmount += parseFloat(entry.amount.toString());
        }
      }

      // Calculate balance based on normal balance
      let balance = 0;
      if (account.normal_balance === 'debit') {
        balance = debitAmount - creditAmount;
      } else {
        balance = creditAmount - debitAmount;
      }

      // Only include accounts with transactions
      if (debitAmount !== 0 || creditAmount !== 0) {
        trialBalance.push({
          accountNumber: account.account_number,
          accountName: account.account_name,
          accountType: account.account_type,
          normalBalance: account.normal_balance,
          debitAmount,
          creditAmount,
          balance,
        });
      }
    }

    return trialBalance;
  }

  /**
   * Export trial balance as CSV
   */
  async exportTrialBalanceAsCSV(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerExportData> {
    const data = await this.generateTrialBalance(startDate, endDate);

    // Calculate totals
    const totalDebits = data.reduce((sum, row) => sum + row.debitAmount, 0);
    const totalCredits = data.reduce((sum, row) => sum + row.creditAmount, 0);

    // Build CSV
    let csv = 'Trial Balance Report\n';
    csv += `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;
    csv += 'Account Number,Account Name,Account Type,Normal Balance,Debit,Credit,Balance\n';

    for (const row of data) {
      csv += `"${row.accountNumber}","${row.accountName}","${row.accountType}","${row.normalBalance}","${row.debitAmount.toFixed(2)}","${row.creditAmount.toFixed(2)}","${row.balance.toFixed(2)}"\n`;
    }

    csv += '\n';
    csv += `Totals,"","","","${totalDebits.toFixed(2)}","${totalCredits.toFixed(2)}",""\n`;

    return {
      format: 'csv',
      fileName: `trial-balance-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`,
      content: csv,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export trial balance as JSON
   */
  async exportTrialBalanceAsJSON(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerExportData> {
    const data = await this.generateTrialBalance(startDate, endDate);

    const totalDebits = data.reduce((sum, row) => sum + row.debitAmount, 0);
    const totalCredits = data.reduce((sum, row) => sum + row.creditAmount, 0);

    const json = {
      report: 'Trial Balance',
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      accounts: data,
      totals: {
        totalDebits: parseFloat(totalDebits.toFixed(2)),
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      },
      generatedAt: new Date().toISOString(),
    };

    return {
      format: 'json',
      fileName: `trial-balance-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`,
      content: JSON.stringify(json, null, 2),
      mimeType: 'application/json',
    };
  }

  /**
   * Export general ledger as CSV
   */
  async exportGeneralLedgerAsCSV(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerExportData> {
    const entries = await this.generalLedgerModel.findAll({
      where: {
        entry_date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      order: [['entry_date', 'ASC'], ['entry_number', 'ASC']],
    });

    let csv = 'General Ledger Report\n';
    csv += `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;
    csv += 'Date,Entry Number,Description,Debit,Credit,Running Balance\n';

    for (const entry of entries) {
      const debit = entry.entry_type === 'debit' ? entry.amount : '';
      const credit = entry.entry_type === 'credit' ? entry.amount : '';
      csv += `"${entry.entry_date}","${entry.entry_number}","${entry.description}","${debit}","${credit}","${entry.running_balance}"\n`;
    }

    return {
      format: 'csv',
      fileName: `general-ledger-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`,
      content: csv,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export general ledger as JSON
   */
  async exportGeneralLedgerAsJSON(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerExportData> {
    const entries = await this.generalLedgerModel.findAll({
      where: {
        entry_date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      order: [['entry_date', 'ASC'], ['entry_number', 'ASC']],
    });

    const json = {
      report: 'General Ledger',
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      entries: entries.map((entry) => ({
        date: entry.entry_date,
        entryNumber: entry.entry_number,
        description: entry.description,
        type: entry.entry_type,
        amount: entry.amount,
        runningBalance: entry.running_balance,
        transactionId: entry.transaction_id,
      })),
      totalEntries: entries.length,
      generatedAt: new Date().toISOString(),
    };

    return {
      format: 'json',
      fileName: `general-ledger-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`,
      content: JSON.stringify(json, null, 2),
      mimeType: 'application/json',
    };
  }

  /**
   * Get account ledger details
   */
  async getAccountLedger(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const where: any = { account_id: accountId };

    if (startDate && endDate) {
      where.entry_date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const entries = await this.generalLedgerModel.findAll({
      where,
      order: [['entry_date', 'ASC'], ['entry_number', 'ASC']],
    });

    return entries;
  }

  /**
   * Generate account balance report
   */
  async generateAccountBalanceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const accounts = await this.chartOfAccountsModel.findAll({
      where: { is_active: true },
    });

    const accountBalances: any[] = [];

    for (const account of accounts) {
      const entries = await this.generalLedgerModel.findAll({
        where: {
          account_id: account.id,
          entry_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      });

      let debitSum = 0;
      let creditSum = 0;

      for (const entry of entries) {
        if (entry.entry_type === 'debit') {
          debitSum += parseFloat(entry.amount.toString());
        } else {
          creditSum += parseFloat(entry.amount.toString());
        }
      }

      let balance = 0;
      if (account.normal_balance === 'debit') {
        balance = debitSum - creditSum;
      } else {
        balance = creditSum - debitSum;
      }

      if (balance !== 0) {
        accountBalances.push({
          accountNumber: account.account_number,
          accountName: account.account_name,
          accountType: account.account_type,
          normalBalance: account.normal_balance,
          balance: parseFloat(balance.toFixed(2)),
          currentBalance: account.current_balance,
        });
      }
    }

    return {
      report: 'Account Balance Report',
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      accounts: accountBalances.sort((a, b) =>
        a.accountNumber.localeCompare(b.accountNumber),
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Export account balance report as CSV
   */
  async exportAccountBalanceAsCSV(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerExportData> {
    const report = await this.generateAccountBalanceReport(startDate, endDate);

    let csv = 'Account Balance Report\n';
    csv += `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;
    csv += 'Account Number,Account Name,Account Type,Normal Balance,Balance,Current Balance\n';

    for (const account of report.accounts) {
      csv += `"${account.accountNumber}","${account.accountName}","${account.accountType}","${account.normalBalance}","${account.balance.toFixed(2)}","${account.currentBalance.toFixed(2)}"\n`;
    }

    return {
      format: 'csv',
      fileName: `account-balance-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`,
      content: csv,
      mimeType: 'text/csv',
    };
  }
}
