import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { parse } from 'csv-parse';
import {
  BankStatement,
  BankStatementLine,
  StatementFileFormat,
  StatementStatus,
} from '../../../models/bank-statement.model';
import { ValidationException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { Readable } from 'stream';

export interface ImportedStatementData {
  bankName: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  statementStartDate: Date;
  statementEndDate: Date;
  transactions: ImportedTransaction[];
}

export interface ImportedTransaction {
  lineNumber: number;
  transactionDate: Date;
  referenceNumber?: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  runningBalance: number;
  extraFields?: Record<string, any>;
}

/**
 * Bank Statement Import Service
 * Handles importing bank statements from various file formats
 */
@Injectable()
export class BankStatementImportService {
  private readonly logger = new Logger('BankStatementImportService');

  constructor(
    @InjectModel(BankStatement)
    private bankStatementModel: typeof BankStatement,
    @InjectModel(BankStatementLine)
    private bankStatementLineModel: typeof BankStatementLine,
  ) {}

  /**
   * Import statement from CSV file
   */
  async importFromCSV(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
  ): Promise<BankStatement> {
    const records = await this.parseCSV(fileBuffer);
    const statementData = this.mapCSVToStatement(records);

    return this.createStatementFromData(
      userId,
      fileName,
      StatementFileFormat.CSV,
      fileBuffer.length,
      statementData,
    );
  }

  /**
   * Import statement from JSON file
   */
  async importFromJSON(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
  ): Promise<BankStatement> {
    const jsonData = JSON.parse(fileBuffer.toString('utf-8'));
    const statementData = this.validateJSONStatement(jsonData);

    return this.createStatementFromData(
      userId,
      fileName,
      StatementFileFormat.JSON,
      fileBuffer.length,
      statementData,
    );
  }

  /**
   * Parse CSV file to array of records
   */
  private parseCSV(fileBuffer: Buffer): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, any>[] = [];
      const stream = Readable.from([fileBuffer]);

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('readable', function () {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('error', (err) => {
        reject(
          new ValidationException('Failed to parse CSV file', [
            {
              field: 'file',
              message: err.message,
              errorCode: ErrorCode.VALIDATION_FAILED,
            },
          ]),
        );
      });

      parser.on('end', () => resolve(records));

      stream.pipe(parser);
    });
  }

  /**
   * Map CSV records to statement data
   */
  private mapCSVToStatement(records: Record<string, any>[]): ImportedStatementData {
    if (!records || records.length === 0) {
      throw new ValidationException('CSV file is empty', [
        {
          field: 'file',
          message: 'No transactions found in CSV',
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
      ]);
    }

    // Extract header row (usually first row has metadata)
    const headerRow = records[0];

    // Validate required header fields
    const requiredFields = [
      'bank_name',
      'account_number',
      'statement_start_date',
      'statement_end_date',
    ];

    for (const field of requiredFields) {
      if (!headerRow[field]) {
        throw new ValidationException('Missing required CSV field', [
          {
            field: field,
            message: `Required field "${field}" not found in CSV`,
            errorCode: ErrorCode.MISSING_REQUIRED_FIELD,
          },
        ]);
      }
    }

    // Parse transactions (skip metadata row)
    const transactions: ImportedTransaction[] = records
      .slice(1)
      .filter((row) => row.transaction_date) // filter out non-transaction rows
      .map((row, index) => ({
        lineNumber: index + 1,
        transactionDate: new Date(row.transaction_date),
        referenceNumber: row.reference_number,
        description: row.description || '',
        amount: parseFloat(row.amount),
        type: row.type === 'debit' ? 'debit' : 'credit',
        runningBalance: parseFloat(row.running_balance),
        extraFields: this.extractExtraFields(row),
      }));

    return {
      bankName: headerRow.bank_name,
      accountNumber: headerRow.account_number,
      currency: headerRow.currency || 'INR',
      openingBalance: parseFloat(headerRow.opening_balance),
      closingBalance: parseFloat(headerRow.closing_balance),
      statementStartDate: new Date(headerRow.statement_start_date),
      statementEndDate: new Date(headerRow.statement_end_date),
      transactions,
    };
  }

  /**
   * Validate JSON statement structure
   */
  private validateJSONStatement(jsonData: any): ImportedStatementData {
    if (!jsonData.statement || !jsonData.transactions) {
      throw new ValidationException('Invalid JSON structure', [
        {
          field: 'file',
          message: 'JSON must contain "statement" and "transactions" objects',
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
      ]);
    }

    const stmt = jsonData.statement;
    const requiredFields = [
      'bankName',
      'accountNumber',
      'statementStartDate',
      'statementEndDate',
      'openingBalance',
      'closingBalance',
    ];

    for (const field of requiredFields) {
      if (stmt[field] === undefined || stmt[field] === null) {
        throw new ValidationException('Missing required JSON field', [
          {
            field: field,
            message: `Required field "${field}" not found in statement`,
            errorCode: ErrorCode.MISSING_REQUIRED_FIELD,
          },
        ]);
      }
    }

    const transactions: ImportedTransaction[] = (jsonData.transactions || []).map(
      (txn: any, index: number) => ({
        lineNumber: index + 1,
        transactionDate: new Date(txn.transactionDate),
        referenceNumber: txn.referenceNumber,
        description: txn.description || '',
        amount: parseFloat(txn.amount),
        type: txn.type === 'debit' ? 'debit' : 'credit',
        runningBalance: parseFloat(txn.runningBalance),
        extraFields: txn.extraFields,
      }),
    );

    return {
      bankName: stmt.bankName,
      accountNumber: stmt.accountNumber,
      currency: stmt.currency || 'INR',
      openingBalance: stmt.openingBalance,
      closingBalance: stmt.closingBalance,
      statementStartDate: new Date(stmt.statementStartDate),
      statementEndDate: new Date(stmt.statementEndDate),
      transactions,
    };
  }

  /**
   * Extract extra fields from CSV row
   */
  private extractExtraFields(row: Record<string, any>): Record<string, any> {
    const standardFields = [
      'bank_name',
      'account_number',
      'statement_start_date',
      'statement_end_date',
      'opening_balance',
      'closing_balance',
      'transaction_date',
      'reference_number',
      'description',
      'amount',
      'type',
      'running_balance',
    ];

    const extra: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!standardFields.includes(key) && value) {
        extra[key] = value;
      }
    }
    return extra;
  }

  /**
   * Create BankStatement and related lines from imported data
   */
  private async createStatementFromData(
    userId: string,
    fileName: string,
    fileFormat: StatementFileFormat,
    fileSize: number,
    statementData: ImportedStatementData,
  ): Promise<BankStatement> {
    const statement = await this.bankStatementModel.create({
      user_id: userId,
      bank_name: statementData.bankName,
      account_number: statementData.accountNumber,
      currency: statementData.currency,
      opening_balance: statementData.openingBalance,
      closing_balance: statementData.closingBalance,
      statement_start_date: statementData.statementStartDate,
      statement_end_date: statementData.statementEndDate,
      file_name: fileName,
      file_format: fileFormat,
      file_size_bytes: fileSize,
      total_transactions: statementData.transactions.length,
      status: StatementStatus.IMPORTED,
      imported_by: userId,
      imported_at: new Date(),
    });

    // Create statement lines
    const lines = statementData.transactions.map((txn) => ({
      statement_id: statement.id,
      line_number: txn.lineNumber,
      transaction_date: txn.transactionDate,
      reference_number: txn.referenceNumber,
      description: txn.description,
      amount: txn.amount,
      transaction_type: txn.type,
      running_balance: txn.runningBalance,
      extra_fields: txn.extraFields,
    }));

    await this.bankStatementLineModel.bulkCreate(lines);

    this.logger.log(
      `Imported statement ${statement.id} with ${lines.length} transactions`,
    );

    return statement;
  }

  /**
   * Get imported statement with lines
   */
  async getStatementWithLines(statementId: string): Promise<BankStatement> {
    const statement = await this.bankStatementModel.findByPk(statementId, {
      include: [
        {
          model: BankStatementLine,
          as: 'lines',
          required: false,
        },
      ],
    });

    if (!statement) {
      throw new ValidationException('Statement not found', [
        {
          field: 'statementId',
          message: `Statement ${statementId} not found`,
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
        },
      ]);
    }

    return statement;
  }

  /**
   * List user's imported statements
   */
  async listStatements(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ statements: BankStatement[]; total: number }> {
    const { rows, count } = await this.bankStatementModel.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    return { statements: rows, total: count };
  }
}
