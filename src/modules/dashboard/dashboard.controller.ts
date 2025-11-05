import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../models/user.model';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('private/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /v1/private/admin/dashboard/metrics - Get dashboard KPIs and metrics
   */
  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard KPIs and metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }

  /**
   * GET /v1/private/admin/dashboard/alerts - Get active alerts for dashboard
   */
  @Get('alerts')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active alerts for dashboard' })
  @ApiResponse({ status: 200, description: 'Active alerts' })
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }
}

