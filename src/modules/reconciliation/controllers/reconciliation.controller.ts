import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User, UserRole } from '../../../models/user.model';
import { BankStatementImportService } from '../services/bank-statement-import.service';
import { StatementReconciliationService } from '../services/statement-reconciliation.service';

@Controller('reconciliation')
@ApiTags('🏦 Bank Reconciliation')
@UseInterceptors(TransformInterceptor)
export class ReconciliationController {
  constructor(
    private readonly importService: BankStatementImportService,
    private readonly reconciliationService: StatementReconciliationService,
  ) {}

  /**
   * POST /v1/private/user/reconciliation/upload-statement
   * Upload bank statement (CSV/JSON)
   */
  @Post('upload-statement')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload bank statement',
    description: 'User: Upload bank statement in CSV or JSON format',
  })
  async uploadStatement(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: any,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = file.originalname;
    const fileBuffer = file.buffer;

    // Determine file format from extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (ext === 'csv') {
      const statement = await this.importService.importFromCSV(
        fileBuffer,
        fileName,
        user.id,
      );
      return {
        success: true,
        statementId: statement.id,
        fileName: statement.file_name,
        status: statement.status,
        totalTransactions: statement.total_transactions,
      };
    } else if (ext === 'json') {
      const statement = await this.importService.importFromJSON(
        fileBuffer,
        fileName,
        user.id,
      );
      return {
        success: true,
        statementId: statement.id,
        fileName: statement.file_name,
        status: statement.status,
        totalTransactions: statement.total_transactions,
      };
    } else {
      throw new Error('Unsupported file format. Supported: CSV, JSON');
    }
  }

  /**
   * POST /v1/private/user/reconciliation/:statementId/reconcile
   * Trigger reconciliation for a statement
   */
  @Post(':statementId/reconcile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reconcile statement',
    description: 'User: Trigger automatic reconciliation of bank statement',
  })
  async reconcileStatement(
    @Param('statementId') statementId: string,
    @Query('algorithm') algorithm: 'exact_amount' | 'fuzzy_match' | 'manual' = 'exact_amount',
    @GetUser() user: any,
  ) {
    const result = await this.reconciliationService.reconcileStatement(
      statementId,
      user.id,
      algorithm,
    );

    return {
      success: true,
      reconciliationId: result.reconciliationId,
      totalLines: result.totalLines,
      matchedLines: result.matchedLines,
      unmatchedLines: result.unmatchedLines,
      variance: result.variance,
      isBalanced: result.isBalanced,
      processingTimeMs: result.processingTimeMs,
    };
  }

  /**
   * GET /v1/private/user/reconciliation/:statementId/report
   * Get reconciliation report
   */
  @Get(':statementId/report')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get reconciliation report',
    description: 'User: Get detailed reconciliation report',
  })
  async getReconciliationReport(@Param('statementId') statementId: string) {
    const report = await this.reconciliationService.getReconciliationReport(
      statementId,
    );

    return {
      success: true,
      reconciliationId: report.id,
      totalLines: report.total_lines,
      matchedLines: report.matched_lines,
      unmatchedLines: report.unmatched_lines,
      variance: report.variance,
      isBalanced: report.is_balanced,
      status: report.status,
      completedAt: report.completed_at,
    };
  }

  /**
   * GET /v1/private/user/reconciliation/:statementId/unmatched
   * Get unmatched lines
   */
  @Get(':statementId/unmatched')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get unmatched lines',
    description: 'User: Get list of unmatched statement lines',
  })
  async getUnmatchedLines(
    @Param('statementId') statementId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.reconciliationService.getUnmatchedLines(
      statementId,
      Math.min(limit, 500),
      offset,
    );

    return {
      success: true,
      total: result.total,
      lines: result.lines.map((line) => ({
        id: line.id,
        lineNumber: line.line_number,
        date: line.transaction_date,
        amount: line.amount,
        type: line.transaction_type,
        description: line.description,
        reference: line.reference_number,
      })),
    };
  }

  /**
   * POST /v1/private/user/reconciliation/lines/:lineId/match
   * Manually match a statement line
   */
  @Post('lines/:lineId/match')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Manually match line',
    description: 'User: Manually match a statement line to internal transaction',
  })
  async manuallyMatchLine(
    @Param('lineId') lineId: string,
    @Body() matchData: { internalTransactionId: string; reason: string },
  ) {
    await this.reconciliationService.manuallyMatchLine(
      lineId,
      matchData.internalTransactionId,
      matchData.reason,
    );

    return {
      success: true,
      message: 'Line matched successfully',
      lineId: lineId,
    };
  }

  /**
   * DELETE /v1/private/user/reconciliation/lines/:lineId/match
   * Unmatch a line
   */
  @Put('lines/:lineId/unmatch')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unmatch line',
    description: 'User: Unmatch a previously matched statement line',
  })
  async unMatchLine(@Param('lineId') lineId: string) {
    await this.reconciliationService.unMatchLine(lineId);

    return {
      success: true,
      message: 'Line unmatched successfully',
      lineId: lineId,
    };
  }

  /**
   * POST /v1/private/user/reconciliation/lines/:lineId/variance
   * Mark line with variance
   */
  @Post('lines/:lineId/variance')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mark variance',
    description: 'User: Mark a line as having a variance',
  })
  async markVariance(
    @Param('lineId') lineId: string,
    @Body() varianceData: { reason: string },
  ) {
    await this.reconciliationService.markLineVariance(
      lineId,
      varianceData.reason,
    );

    return {
      success: true,
      message: 'Variance marked successfully',
      lineId: lineId,
    };
  }

  /**
   * GET /v1/private/user/reconciliation/:statementId/variances
   * Get variance summary
   */
  @Get(':statementId/variances')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get variances',
    description: 'User: Get summary of variances in statement',
  })
  async getVarianceSummary(@Param('statementId') statementId: string) {
    const result = await this.reconciliationService.getVarianceSummary(
      statementId,
    );

    return {
      success: true,
      totalVariances: result.totalVariances,
      variances: result.lines.map((line) => ({
        id: line.id,
        lineNumber: line.line_number,
        reason: line.variance_reason,
        amount: line.amount,
        date: line.transaction_date,
      })),
    };
  }

  /**
   * GET /v1/private/user/reconciliation/statements
   * List user's statements
   */
  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List statements',
    description: 'User: List all imported bank statements',
  })
  async listStatements(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @GetUser() user: any,
  ) {
    const result = await this.importService.listStatements(
      user.id,
      Math.min(limit, 500),
      offset,
    );

    return {
      success: true,
      total: result.total,
      statements: result.statements.map((stmt) => ({
        id: stmt.id,
        bankName: stmt.bank_name,
        accountNumber: stmt.account_number,
        period: `${stmt.statement_start_date} to ${stmt.statement_end_date}`,
        status: stmt.status,
        totalTransactions: stmt.total_transactions,
        matchedTransactions: stmt.matched_transactions,
        unmatchedTransactions: stmt.unmatched_transactions,
        isFullyReconciled: stmt.is_fully_reconciled,
        variance: stmt.reconciliation_variance,
        importedAt: stmt.imported_at,
      })),
    };
  }
}
