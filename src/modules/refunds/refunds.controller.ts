import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserRole } from '../../models/user.model';
import { RefundsService } from './refunds.service';
import {
  CreateRefundRequestDto,
  ApproveRefundDto,
  RejectRefundDto,
  ProcessRefundDto,
  ListRefundRequestsDto,
} from './dto/refund.dto';

@ApiTags('💸 Refund Management')
@Controller('private/admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  /**
   * POST /v1/private/admin/refunds/request - Create refund request
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create refund request' })
  async createRefundRequest(
    @Body() dto: CreateRefundRequestDto,
    @GetUser() user: any,
  ) {
    return this.refundsService.createRefundRequest(dto, user.id);
  }

  /**
   * GET /v1/private/admin/refunds/requests - List refund requests
   */
  @Get('requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all refund requests with filters' })
  async listRefundRequests(@Query() dto: ListRefundRequestsDto) {
    return this.refundsService.listRefundRequests(dto);
  }

  /**
   * GET /v1/private/admin/refunds/requests/:id - Get refund request details
   */
  @Get('requests/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get refund request details by ID' })
  async getRefundRequest(@Param('id') id: string) {
    return this.refundsService.getRefundRequestById(id);
  }

  /**
   * PATCH /v1/private/admin/refunds/requests/:id/approve - Approve refund request
   */
  @Patch('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve refund request' })
  async approveRefundRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
    @GetUser() user: any,
  ) {
    return this.refundsService.approveRefundRequest(id, dto, user.id);
  }

  /**
   * PATCH /v1/private/admin/refunds/requests/:id/reject - Reject refund request
   */
  @Patch('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject refund request' })
  async rejectRefundRequest(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @GetUser() user: any,
  ) {
    return this.refundsService.rejectRefundRequest(id, dto, user.id);
  }

  /**
   * POST /v1/private/admin/refunds/requests/:id/process - Process approved refund
   */
  @Post('requests/:id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process approved refund' })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @GetUser() user: any,
  ) {
    return this.refundsService.processRefund(id, dto, user.id);
  }

  /**
   * GET /v1/private/admin/refunds/processing-log - Get refund processing log
   */
  @Get('processing-log')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get refund processing log/history' })
  async getProcessingLog(
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ) {
    return this.refundsService.getProcessingLog(limit, offset);
  }
}
