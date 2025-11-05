import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../models/user.model';
import { ReportsService } from './reports.service';
import { GenerateTransactionReportDto } from './dtos/reports.dto';

@ApiTags('Reports')
@Controller('private/admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /v1/private/admin/reports/transactions - Generate transaction report (date range)
   */
  @Post('transactions')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate transaction report with date range' })
  @ApiResponse({ status: 200, description: 'Transaction report' })
  async generateTransactionReport(@Body() dto: GenerateTransactionReportDto) {
    return this.reportsService.generateTransactionReport(dto);
  }

  /**
   * GET /v1/private/admin/reports/users - Generate user summary report
   */
  @Get('users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate user summary report' })
  @ApiResponse({ status: 200, description: 'User summary report' })
  async generateUserReport() {
    return this.reportsService.generateUserSummaryReport();
  }

  /**
   * GET /v1/private/admin/reports/aml-summary - Generate AML/fraud summary
   */
  @Get('aml-summary')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AML/fraud summary' })
  @ApiResponse({ status: 200, description: 'AML summary report' })
  async generateAMLSummary() {
    return this.reportsService.generateAMLSummaryReport();
  }

  /**
   * GET /v1/private/admin/reports/reconciliation - Generate reconciliation report
   */
  @Get('reconciliation')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate reconciliation report' })
  @ApiResponse({ status: 200, description: 'Reconciliation report' })
  async generateReconciliationReport() {
    return this.reportsService.generateReconciliationReport();
  }
}

