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
import { Lang } from '../../common/decorators/lang.decorator';
import { UserRole } from '../../models/user.model';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto, UpdateSettlementStatusDto, ListSettlementsDto } from './dtos/settlement.dto';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@ApiTags('💸 Settlements')
@Controller('private/admin/settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * POST /v1/private/admin/settlements - Create settlement
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create settlement',
    description: 'Admin: Create a new settlement batch',
  })
  @ApiResponse({ status: 201, description: 'Settlement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request or batch_id already exists' })
  async createSettlement(@Body() dto: CreateSettlementDto, @Lang() lang?: string) {
    const settlement = await this.settlementsService.createSettlement(dto);
    return this.responseService.success(settlement, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/settlements - List all settlements
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all settlements',
    description: 'Admin: Get list of all settlements with filters',
  })
  @ApiResponse({ status: 200, description: 'List of settlements' })
  async getAllSettlements(@Query() query: ListSettlementsDto, @Lang() lang?: string) {
    const result = await this.settlementsService.getAllSettlements(query);
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * GET /v1/private/admin/settlements/:id - Get settlement details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get settlement details',
    description: 'Admin: Get details of a specific settlement',
  })
  @ApiResponse({ status: 200, description: 'Settlement details' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async getSettlementById(@Param('id') settlementId: string, @Lang() lang?: string) {
    const settlement = await this.settlementsService.getSettlementById(settlementId);
    return this.responseService.success(settlement, StatusCode.SUCCESS, undefined, lang);
  }

  /**
   * PUT /v1/private/admin/settlements/:id/status - Update settlement status
   */
  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update settlement status',
    description: 'Admin: Update settlement status',
  })
  @ApiResponse({ status: 200, description: 'Settlement status updated successfully' })
  @ApiResponse({ status: 404, description: 'Settlement not found' })
  async updateSettlementStatus(
    @Param('id') settlementId: string,
    @Body() dto: UpdateSettlementStatusDto,
    @Lang() lang?: string,
  ) {
    const settlement = await this.settlementsService.updateSettlementStatus(settlementId, dto);
    return this.responseService.success(settlement, StatusCode.SUCCESS, undefined, lang);
  }
}

