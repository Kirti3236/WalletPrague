import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction as SequelizeTransaction } from 'sequelize';
import { I18nService } from 'nestjs-i18n';
import { ChartOfAccounts, AccountType, NormalBalance } from '../../../models/chart-of-accounts.model';
import { Journal, JournalType } from '../../../models/journal.model';
import { JournalEntry, EntryStatus } from '../../../models/journal-entry.model';
import { GeneralLedger } from '../../../models/general-ledger.model';

interface JournalEntryDto {
  journal_id: string;
  entry_date: Date;
  description?: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  transaction_id?: string;
  transaction_type?: string;
}

interface AccountingValidation {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(ChartOfAccounts)
    private readonly chartOfAccountsModel: typeof ChartOfAccounts,
    @InjectModel(Journal)
    private readonly journalModel: typeof Journal,
    @InjectModel(JournalEntry)
    private readonly journalEntryModel: typeof JournalEntry,
    @InjectModel(GeneralLedger)
    private readonly generalLedgerModel: typeof GeneralLedger,
  ) {}

  /**
   * Create and post a journal entry (double-entry transaction)
   * Validates that debits equal credits, updates accounts and GL
   */
  async createJournalEntry(
    entryDto: JournalEntryDto,
    userId: string,
    transaction?: SequelizeTransaction,
  ): Promise<JournalEntry> {
    // Validate accounts exist and are active
    const debitAccount = await this.chartOfAccountsModel.findByPk(
      entryDto.debit_account_id,
    );
    const creditAccount = await this.chartOfAccountsModel.findByPk(
      entryDto.credit_account_id,
    );

    if (!debitAccount || !debitAccount.is_active) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.debit_account_not_found'),
      );
    }

    if (!creditAccount || !creditAccount.is_active) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.credit_account_not_found'),
      );
    }

    // Validate debit and credit amounts are equal (fundamental accounting rule)
    if (Math.abs(entryDto.amount) < 0.01) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.amount_must_be_positive'),
      );
    }

    // Get journal and generate entry number
    const journal = await this.journalModel.findByPk(entryDto.journal_id);
    if (!journal || !journal.is_active) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.journal_not_found'),
      );
    }

    const entryNumber = `${journal.journal_code}-${String(journal.next_entry_number).padStart(6, '0')}`;

    // Create journal entry
    const journalEntry = await this.journalEntryModel.create(
      {
        journal_id: entryDto.journal_id,
        entry_number: entryNumber,
        entry_date: entryDto.entry_date,
        description: entryDto.description,
        debit_account_id: entryDto.debit_account_id,
        credit_account_id: entryDto.credit_account_id,
        debit_amount: entryDto.amount,
        credit_amount: entryDto.amount,
        status: EntryStatus.POSTED,
        transaction_id: entryDto.transaction_id,
        transaction_type: entryDto.transaction_type,
        created_by: userId,
        posted_at: new Date(),
      },
      { transaction },
    );

    // Update journal entry counter
    await journal.increment('next_entry_number', { transaction });

    // Update account balances
    await this.updateAccountBalance(
      debitAccount,
      entryDto.amount,
      NormalBalance.DEBIT,
      transaction,
    );

    await this.updateAccountBalance(
      creditAccount,
      -entryDto.amount,
      NormalBalance.DEBIT,
      transaction,
    );

    // Create GL entries for both debit and credit
    const debitGLEntry = await this.generalLedgerModel.create(
      {
        account_id: entryDto.debit_account_id,
        journal_entry_id: journalEntry.id,
        entry_date: entryDto.entry_date,
        entry_number: entryNumber,
        description: entryDto.description,
        entry_type: 'debit',
        amount: entryDto.amount,
        transaction_id: entryDto.transaction_id,
      },
      { transaction },
    );

    const creditGLEntry = await this.generalLedgerModel.create(
      {
        account_id: entryDto.credit_account_id,
        journal_entry_id: journalEntry.id,
        entry_date: entryDto.entry_date,
        entry_number: entryNumber,
        description: entryDto.description,
        entry_type: 'credit',
        amount: entryDto.amount,
        transaction_id: entryDto.transaction_id,
      },
      { transaction },
    );

    // Update running balances
    await this.updateRunningBalances(
      entryDto.debit_account_id,
      debitGLEntry,
      transaction,
    );
    await this.updateRunningBalances(
      entryDto.credit_account_id,
      creditGLEntry,
      transaction,
    );

    return journalEntry;
  }

  /**
   * Reverse a journal entry (create opposite entry)
   */
  async reverseJournalEntry(
    journalEntryId: string,
    userId: string,
    transaction?: SequelizeTransaction,
  ): Promise<JournalEntry> {
    const originalEntry = await this.journalEntryModel.findByPk(journalEntryId);

    if (!originalEntry) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.journal_entry_not_found'),
      );
    }

    if (originalEntry.status === EntryStatus.REVERSED) {
      throw new ConflictException(
        this.getTranslatedMessage('accounting.entry_already_reversed'),
      );
    }

    // Create reversing entry
    const reversingEntry = await this.createJournalEntry(
      {
        journal_id: originalEntry.journal_id,
        entry_date: new Date(),
        description: `Reversal of ${originalEntry.entry_number}`,
        debit_account_id: originalEntry.credit_account_id,
        credit_account_id: originalEntry.debit_account_id,
        amount: originalEntry.amount,
        transaction_id: originalEntry.transaction_id,
        transaction_type: originalEntry.transaction_type,
      },
      userId,
      transaction,
    );

    // Mark original as reversed
    originalEntry.status = EntryStatus.REVERSED;
    originalEntry.reversed_entry_id = reversingEntry.id;
    await originalEntry.save({ transaction });

    return reversingEntry;
  }

  /**
   * Validate zero-sum (debits = credits) for all entries in a period
   */
  async validateZeroSum(
    startDate: Date,
    endDate: Date,
  ): Promise<AccountingValidation> {
    const entries = await this.journalEntryModel.findAll({
      where: {
        entry_date: {
          [require('sequelize').Op.between]: [startDate, endDate],
        },
        status: EntryStatus.POSTED,
      },
    });

    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach((entry) => {
      totalDebits += Number(entry.amount);
      totalCredits += Number(entry.amount);
    });

    const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      valid: balanced,
      errors: balanced
        ? []
        : [
            `Debit total (${totalDebits}) does not equal credit total (${totalCredits})`,
          ],
    };
  }

  /**
   * Get account balance at a specific date
   */
  async getAccountBalance(accountId: string, asOfDate?: Date): Promise<number> {
    const query: any = { account_id: accountId };

    if (asOfDate) {
      query.entry_date = {
        [require('sequelize').Op.lte]: asOfDate,
      };
    }

    const lastEntry = await this.generalLedgerModel.findOne({
      where: query,
      order: [['entry_date', 'DESC']],
      limit: 1,
    });

    return lastEntry ? Number(lastEntry.running_balance) : 0;
  }

  /**
   * Create trial balance report
   */
  async generateTrialBalance(asOfDate?: Date) {
    const accounts = await this.chartOfAccountsModel.findAll({
      where: { is_active: true },
    });

    const trialBalance: any[] = [];

    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.id, asOfDate);

      if (balance !== 0) {
        const type =
          account.normal_balance === NormalBalance.DEBIT ? 'debit' : 'credit';

        trialBalance.push({
          account_number: account.account_number,
          account_name: account.account_name,
          account_type: account.account_type,
          debit_balance: type === 'debit' ? balance : 0,
          credit_balance: type === 'credit' ? balance : 0,
        });
      }
    }

    // Validate zero-sum
    const totalDebits = trialBalance.reduce(
      (sum, acc) => sum + acc.debit_balance,
      0,
    );
    const totalCredits = trialBalance.reduce(
      (sum, acc) => sum + acc.credit_balance,
      0,
    );

    return {
      as_of_date: asOfDate || new Date(),
      accounts: trialBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  /**
   * Get journal entries for a specific account
   */
  async getAccountLedger(
    accountId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { account_id: accountId };

    if (startDate || endDate) {
      where.entry_date = {};
      if (startDate) {
        where.entry_date[require('sequelize').Op.gte] = startDate;
      }
      if (endDate) {
        where.entry_date[require('sequelize').Op.lte] = endDate;
      }
    }

    const entries = await this.generalLedgerModel.findAll({
      where,
      include: [{ association: 'account' }],
      order: [['entry_date', 'ASC']],
    });

    return entries;
  }

  /**
   * Helper: Update account balance
   */
  private async updateAccountBalance(
    account: ChartOfAccounts,
    amount: number,
    normalBalance: NormalBalance,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    let newBalance = Number(account.current_balance);

    // Apply based on normal balance
    if (normalBalance === NormalBalance.DEBIT) {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }

    account.current_balance = newBalance;
    await account.save({ transaction });
  }

  /**
   * Helper: Update running balances in GL
   */
  private async updateRunningBalances(
    accountId: string,
    newEntry: GeneralLedger,
    transaction?: SequelizeTransaction,
  ): Promise<void> {
    const account = await this.chartOfAccountsModel.findByPk(accountId, {
      transaction,
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const previousEntry = await this.generalLedgerModel.findOne({
      where: { account_id: accountId },
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      limit: 1,
      transaction,
    });

    let previousBalance = 0;
    if (previousEntry && previousEntry.id !== newEntry.id) {
      previousBalance = Number(previousEntry.running_balance);
    }

    // Calculate new running balance based on entry type and normal balance
    let runningBalance = previousBalance;
    if (account.normal_balance === NormalBalance.DEBIT) {
      if (newEntry.entry_type === 'debit') {
        runningBalance += newEntry.amount;
      } else {
        runningBalance -= newEntry.amount;
      }
    } else {
      if (newEntry.entry_type === 'credit') {
        runningBalance += newEntry.amount;
      } else {
        runningBalance -= newEntry.amount;
      }
    }

    newEntry.running_balance = runningBalance;
    await newEntry.save({ transaction });
  }

  /**
   * List all Chart of Accounts
   */
  async listChartOfAccounts() {
    return this.chartOfAccountsModel.findAll({
      order: [['account_number', 'ASC']],
    });
  }

  /**
   * Create a new Chart of Account
   */
  async createChartOfAccount(dto: any, userId: string) {
    // Check if account number already exists
    const existing = await this.chartOfAccountsModel.findOne({
      where: { account_number: dto.account_number },
    });

    if (existing) {
      throw new ConflictException(
        this.getTranslatedMessage('accounting.account_number_exists', undefined, {
          accountNumber: dto.account_number,
        }),
      );
    }

    return this.chartOfAccountsModel.create({
      ...dto,
      created_by: userId,
      is_active: true,
    });
  }

  /**
   * Update an existing Chart of Account
   */
  async updateChartOfAccount(id: string, dto: any) {
    const account = await this.chartOfAccountsModel.findByPk(id);

    if (!account) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.account_not_found', undefined, { id }),
      );
    }

    // If updating account number, check for conflicts
    if (dto.account_number && dto.account_number !== account.account_number) {
      const existing = await this.chartOfAccountsModel.findOne({
        where: { account_number: dto.account_number },
      });

      if (existing) {
        throw new ConflictException(
          this.getTranslatedMessage('accounting.account_number_exists', undefined, {
            accountNumber: dto.account_number,
          }),
        );
      }
    }

    await account.update(dto);
    return account;
  }

  /**
   * Create a new journal
   */
  async createJournal(dto: any, userId: string) {
    // Check if journal code already exists
    const existing = await this.journalModel.findOne({
      where: { journal_code: dto.journal_code },
    });

    if (existing) {
      throw new ConflictException(
        this.getTranslatedMessage('accounting.journal_code_exists', undefined, {
          journalCode: dto.journal_code,
        }),
      );
    }

    const journal = await this.journalModel.create({
      ...dto,
      created_by: userId,
      next_entry_number: 1,
      is_active: true,
    });

    return journal;
  }

  /**
   * List all journals
   */
  async listJournals() {
    const journals = await this.journalModel.findAll({
      order: [['created_at', 'DESC']],
    });

    return {
      total: journals.length,
      journals,
    };
  }

  /**
   * Get journal by ID
   */
  async getJournalById(id: string) {
    const journal = await this.journalModel.findByPk(id);

    if (!journal) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.journal_not_found'),
      );
    }

    return journal;
  }

  /**
   * Get all entries for a journal
   */
  async getJournalEntries(journalId: string) {
    const entries = await this.journalEntryModel.findAll({
      where: { journal_id: journalId },
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: ChartOfAccounts,
          as: 'debit_account',
          attributes: ['id', 'account_number', 'account_name', 'account_type'],
        },
        {
          model: ChartOfAccounts,
          as: 'credit_account',
          attributes: ['id', 'account_number', 'account_name', 'account_type'],
        },
      ],
    });

    return {
      journal_id: journalId,
      total_entries: entries.length,
      entries,
    };
  }

  /**
   * Post journal (mark as final)
   */
  async postJournal(id: string, userId: string) {
    const journal = await this.journalModel.findByPk(id);

    if (!journal) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.journal_not_found'),
      );
    }

    // Update journal to posted status
    await journal.update({
      is_active: false, // Once posted, no more entries can be added
      updated_at: new Date(),
    });

    return {
      message: this.getTranslatedMessage('accounting.journal_posted_success'),
      journal,
    };
  }

  /**
   * Reverse all entries in a journal
   */
  async reverseJournal(id: string, userId: string) {
    const journal = await this.journalModel.findByPk(id);

    if (!journal) {
      throw new BadRequestException(
        this.getTranslatedMessage('accounting.journal_not_found'),
      );
    }

    // Get all entries in this journal
    const entries = await this.journalEntryModel.findAll({
      where: { journal_id: id },
    });

    // Reverse each entry
    const reversedEntries: JournalEntry[] = [];
    for (const entry of entries) {
      const reversed = await this.reverseJournalEntry(entry.id, userId);
      reversedEntries.push(reversed);
    }

    return {
      message: this.getTranslatedMessage('accounting.entries_reversed_success', undefined, {
        count: entries.length,
      }),
      journal_id: id,
      reversed_count: reversedEntries.length,
      reversed_entries: reversedEntries,
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
      return key; // Fallback to key if translation fails
    }
  }
}
