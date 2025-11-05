import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  BankStatement,
  BankStatementLine,
  StatementReconciliation,
  StatementStatus,
} from '../../../models/bank-statement.model';
import { TransactionException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';

export interface MatchResult {
  statementLineId: string;
  internalTransactionId?: string;
  matchConfidence: number;
  matchReason: string;
  isMatched: boolean;
}

export interface ReconciliationResult {
  reconciliationId: string;
  statementId: string;
  totalLines: number;
  matchedLines: number;
  unmatchedLines: number;
  statementClosingBalance: number;
  systemBalance: number;
  variance: number;
  isBalanced: boolean;
  matchingAlgorithm: string;
  processingTimeMs: number;
  unmatchedDetails: BankStatementLine[];
}

/**
 * Statement Reconciliation Service
 * Automatically matches bank statement transactions with internal transactions
 */
@Injectable()
export class StatementReconciliationService {
  private readonly logger = new Logger('StatementReconciliationService');

  constructor(
    @InjectModel(BankStatement)
    private bankStatementModel: typeof BankStatement,
    @InjectModel(BankStatementLine)
    private bankStatementLineModel: typeof BankStatementLine,
    @InjectModel(StatementReconciliation)
    private reconciliationModel: typeof StatementReconciliation,
  ) {}

  /**
   * Reconcile a bank statement
   * Matches statement lines with internal transactions
   */
  async reconcileStatement(
    statementId: string,
    userId: string,
    matchingAlgorithm: 'exact_amount' | 'fuzzy_match' | 'manual' = 'exact_amount',
  ): Promise<ReconciliationResult> {
    const startTime = Date.now();

    // Get statement with lines
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
      throw new TransactionException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Statement ${statementId} not found`,
      );
    }

    // Get statement lines
    const lines = await this.bankStatementLineModel.findAll({
      where: { statement_id: statementId },
      order: [['line_number', 'ASC']],
    });

    // Perform matching based on algorithm
    const matchResults: MatchResult[] = [];

    if (matchingAlgorithm === 'exact_amount') {
      for (const line of lines) {
        const match = await this.matchByExactAmount(line, userId);
        matchResults.push(match);
      }
    } else if (matchingAlgorithm === 'fuzzy_match') {
      for (const line of lines) {
        const match = await this.matchByFuzzyLogic(line, userId);
        matchResults.push(match);
      }
    } else {
      // Manual matching - no automatic matching
      for (const line of lines) {
        matchResults.push({
          statementLineId: line.id,
          matchConfidence: 0,
          matchReason: 'manual_pending',
          isMatched: false,
        });
      }
    }

    // Update statement lines with match results
    for (const match of matchResults) {
      if (match.isMatched) {
        await this.bankStatementLineModel.update(
          {
            is_matched: true,
            matched_internal_transaction_id: match.internalTransactionId,
            match_confidence_percent: match.matchConfidence,
            match_reason: match.matchReason,
            matched_at: new Date(),
          },
          {
            where: { id: match.statementLineId },
          },
        );
      }
    }

    // Calculate statistics
    const matchedCount = matchResults.filter((m) => m.isMatched).length;
    const unmatchedCount = lines.length - matchedCount;

    // Get system balance (sum of matched transactions)
    const systemBalance = await this.calculateSystemBalance(
      matchResults,
      statement.opening_balance,
    );

    const variance = statement.closing_balance - systemBalance;
    const isBalanced = Math.abs(variance) < 0.01; // Allow for rounding errors

    // Update statement status
    await this.bankStatementModel.update(
      {
        status: isBalanced ? StatementStatus.RECONCILED : StatementStatus.MATCHED,
        matched_transactions: matchedCount,
        unmatched_transactions: unmatchedCount,
        is_fully_reconciled: isBalanced,
        reconciliation_variance: variance,
        reconciled_at: isBalanced ? new Date() : null,
      },
      {
        where: { id: statementId },
      },
    );

    // Get unmatched lines
    const unmatchedLines = lines.filter(
      (line) => !matchResults.find((m) => m.statementLineId === line.id && m.isMatched),
    );

    // Create reconciliation record
    const reconciliation = await this.reconciliationModel.create({
      statement_id: statementId,
      reconciled_by: userId,
      status: isBalanced ? 'completed' : 'in_progress',
      total_lines: lines.length,
      matched_lines: matchedCount,
      unmatched_lines: unmatchedCount,
      statement_closing_balance: statement.closing_balance,
      system_balance: systemBalance,
      variance: variance,
      is_balanced: isBalanced,
      matching_algorithm: matchingAlgorithm,
      processing_time_ms: Date.now() - startTime,
      unmatched_details: unmatchedLines.map((line) => ({
        lineNumber: line.line_number,
        amount: line.amount,
        type: line.transaction_type,
        description: line.description,
        date: line.transaction_date,
      })),
      completed_at: isBalanced ? new Date() : null,
    });

    this.logger.log(
      `Reconciled statement ${statementId}: ${matchedCount}/${lines.length} matched, variance: ${variance}`,
    );

    return {
      reconciliationId: reconciliation.id,
      statementId: statementId,
      totalLines: lines.length,
      matchedLines: matchedCount,
      unmatchedLines: unmatchedCount,
      statementClosingBalance: statement.closing_balance,
      systemBalance: systemBalance,
      variance: variance,
      isBalanced: isBalanced,
      matchingAlgorithm: matchingAlgorithm,
      processingTimeMs: Date.now() - startTime,
      unmatchedDetails: unmatchedLines,
    };
  }

  /**
   * Match by exact amount
   * Looks for internal transactions with matching amount and date
   */
  private async matchByExactAmount(
    line: BankStatementLine,
    userId: string,
  ): Promise<MatchResult> {
    // Query internal transactions (Transfer, Deposit, Withdrawal)
    // This is a placeholder - actual implementation would query the specific tables
    // For now, return unmatched result

    return {
      statementLineId: line.id,
      matchConfidence: 0,
      matchReason: 'no_exact_amount_match',
      isMatched: false,
    };
  }

  /**
   * Fuzzy matching logic
   * Uses multiple criteria to find potential matches
   * - Amount match within tolerance
   * - Date match (within 3 days)
   * - Description similarity
   */
  private async matchByFuzzyLogic(
    line: BankStatementLine,
    userId: string,
  ): Promise<MatchResult> {
    // Fuzzy matching implementation
    // Scores based on multiple factors

    // Placeholder: return unmatched
    return {
      statementLineId: line.id,
      matchConfidence: 0,
      matchReason: 'no_fuzzy_match',
      isMatched: false,
    };
  }

  /**
   * Calculate system balance from matched transactions
   */
  private async calculateSystemBalance(
    matchResults: MatchResult[],
    openingBalance: number,
  ): Promise<number> {
    // Sum matched amounts
    let balance = openingBalance;

    // In production, would sum actual matched transactions
    // For now, return opening balance

    return balance;
  }

  /**
   * Get reconciliation report for a statement
   */
  async getReconciliationReport(
    statementId: string,
  ): Promise<StatementReconciliation> {
    const reconciliation = await this.reconciliationModel.findOne({
      where: { statement_id: statementId },
      order: [['created_at', 'DESC']],
    });

    if (!reconciliation) {
      throw new TransactionException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `No reconciliation found for statement ${statementId}`,
      );
    }

    return reconciliation;
  }

  /**
   * Get unmatched lines for manual review
   */
  async getUnmatchedLines(
    statementId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ lines: BankStatementLine[]; total: number }> {
    const { rows, count } = await this.bankStatementLineModel.findAndCountAll({
      where: {
        statement_id: statementId,
        is_matched: false,
      },
      limit,
      offset,
      order: [['line_number', 'ASC']],
    });

    return { lines: rows, total: count };
  }

  /**
   * Manually match a statement line
   */
  async manuallyMatchLine(
    lineId: string,
    internalTransactionId: string,
    matchReason: string,
  ): Promise<BankStatementLine> {
    const line = await this.bankStatementLineModel.findByPk(lineId);

    if (!line) {
      throw new TransactionException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Statement line ${lineId} not found`,
      );
    }

    await this.bankStatementLineModel.update(
      {
        is_matched: true,
        matched_internal_transaction_id: internalTransactionId,
        match_confidence_percent: 100, // Manual match = 100% confidence
        match_reason: matchReason,
        matched_at: new Date(),
      },
      {
        where: { id: lineId },
      },
    );

    return line;
  }

  /**
   * Unmatch a statement line
   */
  async unMatchLine(lineId: string): Promise<BankStatementLine> {
    const line = await this.bankStatementLineModel.findByPk(lineId);

    if (!line) {
      throw new TransactionException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Statement line ${lineId} not found`,
      );
    }

    await this.bankStatementLineModel.update(
      {
        is_matched: false,
        matched_internal_transaction_id: null,
        match_confidence_percent: null,
        match_reason: null,
        matched_at: null,
      },
      {
        where: { id: lineId },
      },
    );

    return line;
  }

  /**
   * Mark line with variance
   */
  async markLineVariance(
    lineId: string,
    varianceReason: string,
  ): Promise<BankStatementLine> {
    const line = await this.bankStatementLineModel.findByPk(lineId);

    if (!line) {
      throw new TransactionException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Statement line ${lineId} not found`,
      );
    }

    await this.bankStatementLineModel.update(
      {
        has_variance: true,
        variance_reason: varianceReason,
      },
      {
        where: { id: lineId },
      },
    );

    return line;
  }

  /**
   * Get variance summary
   */
  async getVarianceSummary(statementId: string): Promise<{
    totalVariances: number;
    lines: BankStatementLine[];
  }> {
    const lines = await this.bankStatementLineModel.findAll({
      where: {
        statement_id: statementId,
        has_variance: true,
      },
      order: [['line_number', 'ASC']],
    });

    return {
      totalVariances: lines.length,
      lines,
    };
  }
}
