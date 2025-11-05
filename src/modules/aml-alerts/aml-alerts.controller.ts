import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../models/user.model';
import { AMLAlertsService } from './aml-alerts.service';
import { ListAMLAlertsDto, ReviewAMLAlertDto, ResolveAMLAlertDto } from './dtos/aml-alert.dto';

@ApiTags('AML/Fraud Alerts')
@Controller('private/admin/aml-alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AMLAlertsController {
  constructor(private readonly amlAlertsService: AMLAlertsService) {}

  /**
   * GET /v1/private/admin/aml-alerts - List AML/fraud alerts with filters
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List AML/fraud alerts with filters' })
  @ApiResponse({ status: 200, description: 'List of AML alerts' })
  async listAlerts(@Query() dto: ListAMLAlertsDto) {
    return this.amlAlertsService.listAlerts(dto);
  }

  /**
   * GET /v1/private/admin/aml-alerts/stats - Get AML alert statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AML alert statistics' })
  @ApiResponse({ status: 200, description: 'Alert statistics' })
  async getAlertStats() {
    return this.amlAlertsService.getAlertStats();
  }

  /**
   * GET /v1/private/admin/aml-alerts/:id - Get detailed AML alert
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed AML alert' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlertById(@Param('id') id: string) {
    return this.amlAlertsService.getAlertById(id);
  }

  /**
   * PATCH /v1/private/admin/aml-alerts/:id/review - Mark alert as reviewed
   */
  @Patch(':id/review')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark alert as reviewed' })
  @ApiResponse({ status: 200, description: 'Alert marked as under review' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 400, description: 'Invalid status for review' })
  async reviewAlert(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ReviewAMLAlertDto,
  ) {
    return this.amlAlertsService.reviewAlert(id, req.user.id, dto);
  }

  /**
   * PATCH /v1/private/admin/aml-alerts/:id/resolve - Resolve alert with resolution type
   */
  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve alert with resolution type' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 400, description: 'Invalid status for resolution' })
  async resolveAlert(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ResolveAMLAlertDto,
  ) {
    return this.amlAlertsService.resolveAlert(id, req.user.id, dto);
  }
}

