import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { UserRole } from '../../models/user.model';
import { FeesService } from './fees.service';
import { CreateFeePolicyDto, UpdateFeePolicyDto, ListFeesDto } from './dtos/fee.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('💰 Fees')
@Controller('private/user/fees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserFeesController {
  constructor(
    private readonly feesService: FeesService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /v1/private/user/fees - List fees for user transactions
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List fees for transactions',
    description: 'User: Get list of fees associated with your transactions',
  })
  @ApiResponse({ status: 200, description: 'List of fees' })
  async getUserFees(
    @Query() query: ListFeesDto,
    @GetUser() user: any,
    @Lang() lang?: string,
  ) {
    const result = await this.feesService.getUserFees(user.id, query);
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }
}

@ApiTags('💰 Admin Fee Management')
@Controller('private/admin/fees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminFeesController {
  constructor(
    private readonly feesService: FeesService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /v1/private/admin/fees/policies - List all fee policies
   */
  @Get('policies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all fee policies',
    description: 'Admin: Get list of all fee policies',
  })
  @ApiResponse({ status: 200, description: 'List of fee policies' })
  async getAllFeePolicies(@Lang() lang?: string) {
    const policies = await this.feesService.getAllFeePolicies();
    return this.responseService.success(policies, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/fees/policies/:code - Get fee policy
   */
  @Get('policies/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get fee policy',
    description: 'Admin: Get details of a specific fee policy',
  })
  @ApiResponse({ status: 200, description: 'Fee policy details' })
  @ApiResponse({ status: 404, description: 'Fee policy not found' })
  async getFeePolicy(@Param('code') code: string, @Lang() lang?: string) {
    const policy = await this.feesService.getFeePolicy(code);
    return this.responseService.success(policy, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * POST /v1/private/admin/fees/policies - Create fee policy
   */
  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create fee policy',
    description: 'Admin: Create a new fee policy',
  })
  @ApiResponse({ status: 201, description: 'Fee policy created successfully' })
  @ApiResponse({ status: 400, description: 'Policy code already exists' })
  async createFeePolicy(@Body() dto: CreateFeePolicyDto, @Lang() lang?: string) {
    const policy = await this.feesService.createFeePolicy(dto);
    return this.responseService.success(policy, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * PUT /v1/private/admin/fees/policies/:code - Update fee policy
   */
  @Put('policies/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update fee policy',
    description: 'Admin: Update an existing fee policy',
  })
  @ApiResponse({ status: 200, description: 'Fee policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Fee policy not found' })
  async updateFeePolicy(
    @Param('code') code: string,
    @Body() dto: UpdateFeePolicyDto,
    @Lang() lang?: string,
  ) {
    const policy = await this.feesService.updateFeePolicy(code, dto);
    return this.responseService.success(policy, StatusCode.SUCCESS, undefined, lang);
  }
}

