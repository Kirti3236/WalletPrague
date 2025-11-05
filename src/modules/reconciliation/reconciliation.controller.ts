import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '../../models/user.model';
import { ReconciliationService } from './reconciliation.service';
import {
  UploadStatementDto,
  MatchTransactionDto,
  UpdateExceptionDto,
  ListStatementsDto,
} from './dtos/reconciliation.dto';

@ApiTags('🔄 Bank Reconciliation')
@Controller('private/admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * POST /v1/private/admin/reconciliation/upload - Upload bank statement
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload bank statement (CSV/OFX)' })
  async uploadStatement(
    @Body() dto: UploadStatementDto,
    @GetUser() user: any,
  ) {
    return this.reconciliationService.uploadStatement(dto, user.id);
  }

  /**
   * GET /v1/private/admin/reconciliation/statements - List bank statements
   */
  @Get('statements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List bank statements' })
  async listStatements(@Query() dto: ListStatementsDto) {
    return this.reconciliationService.listStatements(dto);
  }

  /**
   * GET /v1/private/admin/reconciliation/statements/:id - Get statement details
   */
  @Get('statements/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get statement details and lines' })
  async getStatementDetails(@Param('id') id: string) {
    return this.reconciliationService.getStatementDetails(id);
  }

  /**
   * POST /v1/private/admin/reconciliation/match - Match statement line with transaction
   */
  @Post('match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Match statement line with transaction' })
  async matchTransaction(
    @Body() dto: MatchTransactionDto,
    @GetUser() user: any,
  ) {
    return this.reconciliationService.matchTransaction(dto, user.id);
  }

  /**
   * GET /v1/private/admin/reconciliation/matches - Get matched transactions
   */
  @Get('matches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List matched transactions' })
  async getMatches() {
    return this.reconciliationService.getMatches();
  }

  /**
   * GET /v1/private/admin/reconciliation/exceptions - Get unmatched exceptions
   */
  @Get('exceptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List unmatched exceptions' })
  async getExceptions() {
    return this.reconciliationService.getExceptions();
  }

  /**
   * PATCH /v1/private/admin/reconciliation/exceptions/:id - Update exception
   */
  @Patch('exceptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update exception status' })
  async updateException(
    @Param('id') id: string,
    @Body() dto: UpdateExceptionDto,
    @GetUser() user: any,
  ) {
    return this.reconciliationService.updateException(id, dto, user.id);
  }

  /**
   * GET /v1/private/admin/reconciliation/report - Get reconciliation report
   */
  @Get('report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reconciliation summary report' })
  async getReconciliationReport(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.reconciliationService.getReconciliationReport(startDate, endDate);
  }
}

