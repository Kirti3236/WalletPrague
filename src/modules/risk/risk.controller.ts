import {
  Controller,
  Get,
  Post,
  Query,
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
import { RiskService } from './risk.service';
import { EvaluateRiskDto, GetLimitCountersDto } from './dtos/risk.dto';

@ApiTags('Risk Management')
@Controller('private/admin/risk')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  /**
   * POST /v1/private/admin/risk/evaluate - Evaluate transaction risk
   */
  @Post('evaluate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate transaction risk' })
  @ApiResponse({ status: 200, description: 'Risk evaluation results' })
  async evaluateRisk(@Body() dto: EvaluateRiskDto): Promise<any> {
    return this.riskService.evaluateTransactionRisk(dto);
  }

  /**
   * GET /v1/private/admin/risk/counters - Get user limit counters (daily/monthly)
   */
  @Get('counters')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user limit counters' })
  @ApiResponse({ status: 200, description: 'User limit counters' })
  async getLimitCounters(@Query() dto: GetLimitCountersDto) {
    return this.riskService.getLimitCounters(dto);
  }

  /**
   * GET /v1/private/admin/risk/restrictions - List active restrictions and blocks
   */
  @Get('restrictions')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active restrictions and blocks' })
  @ApiResponse({ status: 200, description: 'Active restrictions' })
  async getRestrictions() {
    return this.riskService.getRestrictions();
  }
}

