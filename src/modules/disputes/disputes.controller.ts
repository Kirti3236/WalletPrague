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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { UserRole } from '../../models/user.model';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, UpdateDisputeStatusDto, ListDisputesDto } from './dtos/dispute.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('💼 Disputes & Chargebacks')
@Controller('private/user/disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserDisputesController {
  constructor(
    private readonly disputesService: DisputesService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * POST /v1/private/user/disputes - File a dispute
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'File a dispute for a transaction',
    description: 'User: File a dispute for a specific transaction',
  })
  @ApiResponse({ status: 201, description: 'Dispute created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or dispute already exists' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async createDispute(
    @Body() dto: CreateDisputeDto,
    @GetUser() user: any,
    @Lang() lang?: string,
  ) {
    const dispute = await this.disputesService.createDispute(user.id, dto);
    return this.responseService.success(dispute, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/user/disputes - List user disputes
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List user disputes',
    description: 'User: Get list of your disputes',
  })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  async getUserDisputes(
    @Query() query: ListDisputesDto,
    @GetUser() user: any,
    @Lang() lang?: string,
  ) {
    const result = await this.disputesService.getUserDisputes(user.id, query);
    // For GET requests, TransformInterceptor will wrap the response
    // Return raw data to avoid double-nesting
    return result;
  }

  /**
   * GET /v1/private/user/disputes/:id - Get dispute details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dispute details',
    description: 'User: Get details of a specific dispute',
  })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeById(
    @Param('id') disputeId: string,
    @GetUser() user: any,
    @Lang() lang?: string,
  ) {
    const dispute = await this.disputesService.getDisputeById(disputeId, user.id);
    // For GET requests, TransformInterceptor will wrap the response
    // Return raw data to avoid double-nesting
    return dispute;
  }
}

@ApiTags('💼 Admin Disputes')
@Controller('private/admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminDisputesController {
  constructor(
    private readonly disputesService: DisputesService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /v1/private/admin/disputes - List all disputes
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all disputes',
    description: 'Admin: Get list of all disputes with filters',
  })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  async getAllDisputes(@Query() query: ListDisputesDto, @Lang() lang?: string) {
    const result = await this.disputesService.getAllDisputes(query);
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/disputes/:id - Get dispute details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dispute details',
    description: 'Admin: Get details of a specific dispute',
  })
  @ApiResponse({ status: 200, description: 'Dispute details' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeById(@Param('id') disputeId: string, @Lang() lang?: string) {
    const dispute = await this.disputesService.getDisputeById(disputeId);
    return this.responseService.success(dispute, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * PUT /v1/private/admin/disputes/:id - Update dispute status
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update dispute status',
    description: 'Admin: Update dispute status and resolution',
  })
  @ApiResponse({ status: 200, description: 'Dispute updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async updateDisputeStatus(
    @Param('id') disputeId: string,
    @Body() dto: UpdateDisputeStatusDto,
    @Request() req: any,
    @Lang() lang?: string,
  ) {
    const dispute = await this.disputesService.updateDisputeStatus(disputeId, req.user.id, dto);
    return this.responseService.success(dispute, StatusCode.SUCCESS, undefined, lang);
  }
}

