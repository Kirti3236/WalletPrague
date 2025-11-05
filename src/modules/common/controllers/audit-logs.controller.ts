import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '../../../models/user.model';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { AuditLogService } from '../services/audit-log.service';

@Controller('private/admin/audit')
@ApiTags('🔐 Audit Logs & Compliance')
@UseInterceptors(TransformInterceptor)
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /v1/private/admin/audit/logs - List all audit logs with filters
   */
  @Get('logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List audit logs',
    description: 'Admin: List all audit logs with optional filters',
  })
  async listAuditLogs(
    @Query('user_id') userId?: string,
    @Query('resource_type') resourceType?: string,
    @Query('action') action?: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ) {
    // For now, get all logs (can add filtering later)
    const result = await this.auditLogService.getUserAuditLogs(
      userId || 'all',
      Math.min(limit, 1000),
      offset,
    );
    return {
      total: result.total || (Array.isArray(result) ? result.length : 0),
      limit,
      offset,
      logs: Array.isArray(result) ? result : result.logs || [],
    };
  }

  /**
   * POST /v1/private/admin/audit/verify-chain - Verify hash chain integrity
   */
  @Post('verify-chain')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify audit log integrity',
    description: 'Admin: Verify hash chain integrity (detect tampering)',
  })
  async verifyIntegrity(@Query('start_id') startId?: string) {
    return await this.auditLogService.verifyHashChainIntegrity(startId);
  }

  /**
   * GET /v1/private/admin/audit/export - Export audit logs
   */
  @Get('export')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Export audit logs',
    description: 'Admin: Export audit logs for compliance or analysis',
  })
  async exportAuditLogs(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('format') format: 'csv' | 'json' = 'json',
  ) {
    if (startDate && endDate) {
      const logs = await this.auditLogService.exportComplianceLogs(
        new Date(startDate),
        new Date(endDate),
      );
      return {
        format,
        period: `${startDate} to ${endDate}`,
        total_logs: logs.length,
        logs,
      };
    }
    return {
      message: 'Please provide start_date and end_date parameters',
    };
  }

  /**
   * GET /v1/private/admin/audit-logs/user/:id
   * Get user audit logs
   */
  @Get('user/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user audit logs',
    description: 'Admin: Get all audit logs for a specific user',
  })
  async getUserAuditLogs(
    @Param('id') userId: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ) {
    return await this.auditLogService.getUserAuditLogs(
      userId,
      Math.min(limit, 1000),
      offset,
    );
  }

  /**
   * GET /v1/private/admin/audit-logs/resource/:type/:id
   * Get resource audit logs
   */
  @Get('resource/:type/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get resource audit logs',
    description: 'Admin: Get complete history for a specific resource',
  })
  async getResourceAuditLogs(
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
  ) {
    const logs = await this.auditLogService.getResourceAuditLogs(
      resourceType,
      resourceId,
    );
    return {
      resource: `${resourceType}/${resourceId}`,
      total_entries: logs.length,
      logs,
    };
  }

  /**
   * POST /v1/private/admin/audit-logs/export-compliance
   * Export compliance logs
   */
  @Post('export-compliance')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Export compliance logs',
    description: 'Admin: Export compliance-relevant logs for auditors',
  })
  async exportComplianceLogs(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const logs = await this.auditLogService.exportComplianceLogs(
      new Date(startDate),
      new Date(endDate),
    );
    return {
      period: `${startDate} to ${endDate}`,
      total_logs: logs.length,
      logs,
    };
  }

  /**
   * GET /v1/private/admin/audit-logs/failures
   * Get failed audit logs
   */
  @Get('failures')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get failed audit logs',
    description: 'Admin: Get logs of failed actions for troubleshooting',
  })
  async getFailedLogs(@Query('limit') limit: number = 100) {
    const logs = await this.auditLogService.getFailedAuditLogs(
      Math.min(limit, 1000),
    );
    return {
      total_failed: logs.length,
      logs,
    };
  }

  /**
   * GET /v1/private/admin/audit-logs/latest
   * Get latest audit log
   */
  @Get('latest')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get latest audit log',
    description: 'Admin: Get the most recent audit log entry',
  })
  async getLatestLog() {
    const log = await this.auditLogService.getLatestAuditLog();
    return log || { message: 'No audit logs found' };
  }
}

// Separate controller for user-facing audit trail
@Controller('private/user/audit-trail')
@ApiTags('🔐 Personal Audit Trail')
@UseInterceptors(TransformInterceptor)
export class UserAuditTrailController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /v1/private/user/audit-trail - Get personal audit trail (user actions on own account)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get personal audit trail',
    description: 'User: Get your own audit trail (actions on your account)',
  })
  async getMyAuditTrail(
    @GetUser() user: any,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return await this.auditLogService.getUserAuditLogs(user.id, limit, offset);
  }

  /**
   * GET /v1/private/user/audit-trail/export - Export personal audit trail to CSV or PDF
   */
  @Get('export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Export personal audit trail (GET)',
    description: 'User: Export your audit trail to CSV or PDF',
  })
  async exportMyAuditTrailGet(
    @GetUser() user: any,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query('limit') limit: number = 1000,
  ) {
    const logs = await this.auditLogService.getUserAuditLogs(user.id, limit);
    
    if (format === 'csv') {
      // Return CSV format
      return {
        format: 'csv',
        data: logs,
        message: 'Use the data array to generate CSV on client side',
      };
    } else if (format === 'pdf') {
      // Return PDF format placeholder
      return {
        format: 'pdf',
        data: logs,
        message: 'Use the data array to generate PDF on client side',
      };
    }
    
    return logs;
  }

  /**
   * POST /v1/private/user/audit-trail/export - Export personal audit trail to CSV or PDF
   */
  @Post('export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Export personal audit trail (POST)',
    description: 'User: Export your audit trail to CSV or PDF',
  })
  async exportMyAuditTrail(
    @GetUser() user: any,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query('limit') limit: number = 1000,
  ) {
    const logs = await this.auditLogService.getUserAuditLogs(user.id, limit);
    
    if (format === 'csv') {
      // Return CSV format
      return {
        format: 'csv',
        data: logs,
        message: 'Use the data array to generate CSV on client side',
      };
    } else if (format === 'pdf') {
      // Return PDF format placeholder
      return {
        format: 'pdf',
        data: logs,
        message: 'Use the data array to generate PDF on client side',
      };
    }
    
    return logs;
  }
}
