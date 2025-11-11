import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { UserRole } from '../../../models/user.model';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { LimitValidationService } from '../services/limit-validation.service';
import { LimitPoliciesService } from '../services/limit-policies.service';
import { LimitCountersService } from '../services/limit-counters.service';
import {
  CreateLimitPolicyDto,
  UpdateLimitPolicyDto,
  AssignPolicyDto,
  CheckLimitDto,
} from '../dtos/limit-policy.dto';

@Controller('private/limits')
@ApiTags('💰 User Limits & Risk Management')
@UseInterceptors(TransformInterceptor)
export class LimitsController {
  constructor(
    private readonly limitValidationService: LimitValidationService,
    private readonly limitPoliciesService: LimitPoliciesService,
    private readonly limitCountersService: LimitCountersService,
  ) {}

  /**
   * GET /v1/private/user/limits
   * Get user's current limit policy and usage
   */
  @Get('user/limits')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user limit policy and usage',
    description: 'Get user current limit policy, usage, and remaining limits',
  })
  async getUserLimits(@GetUser() user: any) {
    return await this.limitValidationService.getUserLimitStatus(user.id);
  }

  /**
   * POST /v1/private/user/limits/check
   * Check if a specific amount is within user limits
   */
  @Post('user/limits/check')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if transaction amount is within limits',
    description: 'Check if a specific amount can be transferred based on user limits',
  })
  async checkLimit(
    @GetUser() user: any,
    @Body() checkLimitDto: CheckLimitDto,
  ) {
    const result = await this.limitValidationService.validateTransaction(
      user.id,
      checkLimitDto.amount,
    );

    return {
      allowed: result.allowed,
      reason: result.reason,
      remaining_daily_amount: result.remaining_daily_amount,
      remaining_daily_count: result.remaining_daily_count,
      remaining_monthly_amount: result.remaining_monthly_amount,
      remaining_monthly_count: result.remaining_monthly_count,
    };
  }

  /**
   * GET /v1/private/admin/limit-policies
   * List all limit policies (admin only)
   */
  @Get('admin/limit-policies')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all limit policies',
    description: 'Admin: Get all active and inactive limit policies',
  })
  async getAllPolicies() {
    const policies = await this.limitPoliciesService.getAllPolicies(false);
    return {
      total: policies.length,
      policies,
    };
  }

  /**
   * POST /v1/private/admin/limit-policies
   * Create a new limit policy (admin only)
   */
  @Post('admin/limit-policies')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new limit policy',
    description: 'Admin: Create new tiered limit policy',
  })
  async createPolicy(
    @GetUser() user: any,
    @Body() createPolicyDto: CreateLimitPolicyDto,
  ) {
    return await this.limitPoliciesService.createPolicy(
      createPolicyDto,
      user.id,
    );
  }

  /**
   * PUT /v1/private/admin/limit-policies/:id
   * Update a limit policy (admin only)
   */
  @Put('admin/limit-policies/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a limit policy',
    description: 'Admin: Update existing limit policy details',
  })
  async updatePolicy(
    @Param('id') policyId: string,
    @Body() updatePolicyDto: UpdateLimitPolicyDto,
  ) {
    const policy = await this.limitPoliciesService.updatePolicy(
      policyId,
      updatePolicyDto,
    );

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return policy;
  }

  /**
   * PUT /v1/private/admin/limit-policies/:id/status
   * Toggle policy active/inactive (admin only)
   */
  @Put('admin/limit-policies/:id/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle policy status',
    description: 'Admin: Activate or deactivate a limit policy',
  })
  async togglePolicyStatus(
    @Param('id') policyId: string,
    @Body() body: { is_active: boolean },
  ) {
    const policy = await this.limitPoliciesService.togglePolicyStatus(
      policyId,
      body.is_active,
    );

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    return policy;
  }

  /**
   * PUT /v1/private/admin/users/:id/limit-policy
   * Assign or update user's limit policy (admin only)
   */
  @Put('admin/users/:id/limit-policy')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Assign limit policy to user',
    description: 'Admin: Assign or update a user limit policy',
  })
  async assignPolicyToUser(
    @Param('id') userId: string,
    @GetUser() admin: any,
    @Body() assignPolicyDto: AssignPolicyDto,
  ) {
    return await this.limitValidationService.assignPolicyToUser(
      userId,
      assignPolicyDto.policy_code,
      admin.id,
    );
  }

  /**
   * GET /v1/private/admin/users/:id/limit-status
   * Get detailed limit status for a specific user (admin only)
   */
  @Get('admin/users/:id/limit-status')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user limit status',
    description: 'Admin: Get detailed limit policy and usage for specific user',
  })
  async getUserLimitStatus(@Param('id') userId: string) {
    const status = await this.limitValidationService.getUserLimitStatus(userId);

    if (!status.has_policy) {
      throw new NotFoundException('User has no limit policy assigned');
    }

    return status;
  }
}
