import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
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
import {
  CreateLimitPolicyDto,
  UpdateLimitPolicyDto,
  AssignPolicyDto,
} from '../dtos/limit-policy.dto';

@Controller('private/admin/limits')
@ApiTags('💰 Admin Limit Management')
@UseInterceptors(TransformInterceptor)
export class AdminLimitsController {
  constructor(
    private readonly limitValidationService: LimitValidationService,
    private readonly limitPoliciesService: LimitPoliciesService,
  ) {}

  /**
   * GET /v1/private/admin/limits/policies - List all limit policies
   */
  @Get('policies')
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
   * POST /v1/private/admin/limits/policies - Create a new limit policy
   */
  @Post('policies')
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
   * PATCH /v1/private/admin/limits/policies/:id - Update a limit policy
   */
  @Patch('policies/:id')
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
   * POST /v1/private/admin/limits/assign - Assign limit policy to user
   */
  @Post('assign')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Assign limit policy to user',
    description: 'Admin: Assign or update a user limit policy',
  })
  async assignPolicyToUser(
    @GetUser() admin: any,
    @Body() assignPolicyDto: AssignPolicyDto & { user_id: string },
  ) {
    return await this.limitValidationService.assignPolicyToUser(
      assignPolicyDto.user_id,
      assignPolicyDto.policy_code,
      admin.id,
    );
  }

  /**
   * GET /v1/private/admin/limits/user/:user_id - Get user limit status
   */
  @Get('user/:user_id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user limit status',
    description: 'Admin: Get detailed limit policy and usage for specific user',
  })
  async getUserLimitStatus(@Param('user_id') userId: string) {
    const status = await this.limitValidationService.getUserLimitStatus(userId);

    if (!status.has_policy) {
      throw new NotFoundException('User has no limit policy assigned');
    }

    return status;
  }

  /**
   * PATCH /v1/private/admin/limits/user/:user_id - Update user limit override
   */
  @Patch('user/:user_id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user limit override',
    description: 'Admin: Override specific limits for a user',
  })
  async updateUserLimit(
    @Param('user_id') userId: string,
    @GetUser() admin: any,
    @Body() body: { policy_code: string },
  ) {
    return await this.limitValidationService.assignPolicyToUser(
      userId,
      body.policy_code,
      admin.id,
    );
  }
}

