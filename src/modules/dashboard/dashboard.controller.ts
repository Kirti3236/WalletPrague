import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
   * GET /v1/private/admin/dashboard/summary - Get dashboard summary overview
   */
  @Get('summary')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  async getSummary() {
    return this.dashboardService.getSummary();
  }

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
   * GET /v1/private/admin/dashboard/top-users - Get top active users
   */
  @Get('top-users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get top active users by activity/volume' })
  @ApiResponse({ status: 200, description: 'Top users list' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users to return (default: 10)' })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['volume', 'activity'], description: 'Sort by volume or activity' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'], description: 'Time period' })
  async getTopUsers(
    @Query('limit') limit: number = 10,
    @Query('sort_by') sortBy: 'volume' | 'activity' = 'volume',
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    return this.dashboardService.getTopUsers(limit, sortBy, period);
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

