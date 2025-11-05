import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { BankStatement } from '../../models/bank-statement.model';
import { BankStatementLine } from '../../models/bank-statement.model';
import { Transaction } from '../../models/transaction.model';
import { Op } from 'sequelize';
import {
  UploadStatementDto,
  MatchTransactionDto,
  UpdateExceptionDto,
  ListStatementsDto,
  ReconciliationStatus,
} from './dtos/reconciliation.dto';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(BankStatement)
    private readonly bankStatementModel: typeof BankStatement,
    @InjectModel(BankStatementLine)
    private readonly bankStatementLineModel: typeof BankStatementLine,
    @InjectModel(Transaction)
    private readonly transactionModel: typeof Transaction,
  ) {}

  /**
   * Upload and parse bank statement
   */
  async uploadStatement(dto: UploadStatementDto, userId: string) {
    // Create bank statement record
    const statement = await this.bankStatementModel.create({
      file_name: dto.file_name,
      file_format: dto.file_format,
      statement_start_date: dto.statement_date,
      statement_end_date: dto.statement_date,
      user_id: userId,
      bank_name: 'Bank',
      account_number: '000000',
      currency: 'INR',
      opening_balance: 0,
      closing_balance: 0,
      status: 'pending_import' as any,
      total_transactions: 0,
      matched_transactions: 0,
      unmatched_transactions: 0,
    });

    return {
      message: 'Bank statement uploaded successfully',
      statement_id: statement.id,
      statement,
    };
  }

  /**
   * List all bank statements
   */
  async listStatements(dto: ListStatementsDto) {
    const where: any = {};
    if (dto.status) {
      where.status = dto.status;
    }

    const statements = await this.bankStatementModel.findAll({
      where,
      limit: dto.limit || 50,
      offset: dto.offset || 0,
      order: [['statement_date', 'DESC'], ['created_at', 'DESC']],
    });

    const total = await this.bankStatementModel.count({ where });

    return {
      total,
      statements,
    };
  }

  /**
   * Get statement details with lines
   */
  async getStatementDetails(id: string) {
    const statement = await this.bankStatementModel.findByPk(id);

    if (!statement) {
      throw new NotFoundException(
        this.getTranslatedMessage('reconciliation.file_invalid'),
      );
    }

    const lines = await this.bankStatementLineModel.findAll({
      where: { statement_id: id },
      include: [
        {
          model: Transaction,
          as: 'matched_transaction',
          required: false,
        },
      ],
    });

    return {
      statement,
      lines,
      total_lines: lines.length,
      matched_lines: lines.filter((l) => l.is_matched).length,
      exception_lines: lines.filter((l) => !l.is_matched).length,
    };
  }

  /**
   * Match statement line with transaction
   */
  async matchTransaction(dto: MatchTransactionDto, userId: string) {
    const line = await this.bankStatementLineModel.findByPk(dto.statement_line_id);
    if (!line) {
      throw new NotFoundException(
        this.getTranslatedMessage('reconciliation.file_invalid'),
      );
    }

    const transaction = await this.transactionModel.findByPk(dto.transaction_id);
    if (!transaction) {
      throw new NotFoundException(
        this.getTranslatedMessage('transactions.transaction_not_found'),
      );
    }

    // Match the line
    await line.update({
      is_matched: true,
      matched_transaction_id: dto.transaction_id,
      matched_at: new Date(),
      matched_by: userId,
    });

    // Update statement counts
    const statement = await this.bankStatementModel.findByPk(line.statement_id);
    if (statement) {
      await statement.update({
        matched_transactions: (statement.matched_transactions || 0) + 1,
      });
    }

    return {
      message: 'Transaction matched successfully',
      line,
      transaction,
    };
  }

  /**
   * Get matched transactions
   */
  async getMatches() {
    const matches = await this.bankStatementLineModel.findAll({
      where: { is_matched: true },
      include: [
        {
          model: Transaction,
          as: 'matched_transaction',
        },
        {
          model: BankStatement,
          as: 'statement',
        },
      ],
      order: [['matched_at', 'DESC']],
      limit: 100,
    });

    return {
      total: matches.length,
      matches,
    };
  }

  /**
   * Get unmatched exceptions
   */
  async getExceptions() {
    const exceptions = await this.bankStatementLineModel.findAll({
      where: { is_matched: false },
      include: [
        {
          model: BankStatement,
          as: 'statement',
        },
      ],
      order: [['transaction_date', 'DESC']],
      limit: 100,
    });

    return {
      total: exceptions.length,
      exceptions,
    };
  }

  /**
   * Update exception status
   */
  async updateException(id: string, dto: UpdateExceptionDto, userId: string) {
    const line = await this.bankStatementLineModel.findByPk(id);
    if (!line) {
      throw new NotFoundException(
        this.getTranslatedMessage('reconciliation.file_invalid'),
      );
    }

    await line.update({
      notes: dto.notes,
      updated_at: new Date(),
    });

    return {
      message: 'Exception updated successfully',
      line,
    };
  }

  /**
   * Generate reconciliation report
   */
  async getReconciliationReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate && endDate) {
      where.statement_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const statements = await this.bankStatementModel.findAll({
      where,
      order: [['statement_date', 'DESC']],
    });

    const summary = {
      total_statements: statements.length,
      total_transactions: statements.reduce((sum, s) => sum + (s.total_transactions || 0), 0),
      matched_transactions: statements.reduce((sum, s) => sum + (s.matched_transactions || 0), 0),
      unmatched_transactions: statements.reduce((sum, s) => sum + (s.unmatched_transactions || 0), 0),
      match_rate: 0,
    };

    if (summary.total_transactions > 0) {
      summary.match_rate = (summary.matched_transactions / summary.total_transactions) * 100;
    }

    return {
      summary,
      statements,
      period: {
        start: startDate || 'all',
        end: endDate || 'all',
      },
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

