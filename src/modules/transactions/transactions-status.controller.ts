import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { User, UserRole } from '../../models/user.model';
import { TransactionsService } from './transactions.service';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';
import { InjectModel } from '@nestjs/sequelize';
import { TxnStatus } from '../../models/txn-status.model';

@ApiTags('📊 Transaction Status')
@Controller('private/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TransactionStatusController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly responseService: ResponseService,
    @InjectModel(TxnStatus)
    private txnStatusModel: typeof TxnStatus,
  ) {}

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * GET /v1/private/transactions/:id/status - Get transaction status
   */
  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction status',
    description: 'Get the status of a specific transaction',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction status retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid transaction ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found or access denied',
  })
  async getTransactionStatus(
    @Param('id') transactionId: string,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(transactionId)) {
        throw new BadRequestException(
          'Invalid transaction ID format. Must be a valid UUID.',
        );
      }

      const transaction = await this.transactionsService.getTransactionDetails(
        transactionId,
        currentUser.id,
        lang,
      );

      // Return only status information
      return this.responseService.success(
        {
          id: transaction.id,
          status: transaction.status,
          processed_at: transaction.processed_at,
        },
        StatusCode.SUCCESS,
        undefined,
        lang,
      );
    } catch (error) {
      throw error;
    }
  }
}

@ApiTags('📊 Admin Transaction Status')
@Controller('private/admin/transactions/status')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminTransactionStatusController {
  constructor(
    @InjectModel(TxnStatus)
    private txnStatusModel: typeof TxnStatus,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /v1/private/admin/transactions/status/catalog - Get transaction status catalog
   */
  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction status catalog',
    description: 'Admin: Get list of all available transaction status codes',
  })
  @ApiResponse({
    status: 200,
    description: 'Status catalog retrieved successfully',
  })
  async getTransactionStatusCatalog(@Lang() lang?: string) {
    const statuses = await this.txnStatusModel.findAll({
      order: [['code', 'ASC']],
    });
    const result = {
      statuses: statuses.map(s => ({
        code: s.code,
        label: s.label,
        description: s.description,
      })),
    };
    return this.responseService.success(result, StatusCode.SUCCESS, undefined, lang);
  }
}

