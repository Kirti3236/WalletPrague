import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AMLAlertsService } from './aml-alerts.service';
import { AlertStatus } from '../../models/aml-alert.model';

@ApiTags('🛡️ User AML Status')
@Controller('private/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAMLStatusController {
  constructor(private readonly amlAlertsService: AMLAlertsService) {}

  /**
   * GET /v1/private/user/aml-status - Get user's AML compliance status
   */
  @Get('aml-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: "Get user's AML compliance status",
    description: 'Get AML screening status and any alerts related to the authenticated user'
  })
  @ApiResponse({ status: 200, description: 'User AML status' })
  async getMyAMLStatus(@GetUser() user: any) {
    // Get alerts related to this user
    const alerts = await this.amlAlertsService.listAlerts({
      user_id: user.id,
      status: AlertStatus.PENDING,
    });

    const stats = await this.amlAlertsService.getAlertStats();

    return {
      user_id: user.id,
      aml_status: alerts.pagination.total > 0 ? 'under_review' : 'clear',
      active_alerts: alerts.pagination.total || 0,
      alert_details: alerts.data || [],
      last_check: new Date().toISOString(),
      compliance_level: alerts.pagination.total > 0 ? 'restricted' : 'full_access',
    };
  }
}

